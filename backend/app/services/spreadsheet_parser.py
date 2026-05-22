# backend/app/services/spreadsheet_parser.py

import pandas as pd
import numpy as np
import re
import io
from typing import List, Dict, Any, Tuple, Optional
from decimal import Decimal, InvalidOperation
from datetime import date

from app.schemas.upload import (
    ColumnMapping, RowError, ColumnDetectionResult,
    VALID_TARGET_FIELDS
)


# Mapeamento fuzzy — nomes comuns de colunas para campos do sistema
COLUMN_HINTS = {
    "name": ["nome", "colaborador", "funcionário", "empregado", "name", "employee"],
    "registration": ["matrícula", "matricula", "registro", "id", "código", "code"],
    "department": ["departamento", "setor", "area", "área", "department"],
    "position_title": ["cargo", "função", "funcao", "position", "title", "role"],
    "current_salary": [
        "salário", "salario", "remuneração", "remuneracao",
        "salary", "wage", "sal", "vencimento"
    ],
    "hire_date": ["admissão", "admissao", "contratação", "hire", "data admissão"],
    "cost_center": ["centro de custo", "cc", "cost center", "centro_custo"],
    "manager_name": ["gestor", "gerente", "manager", "responsável", "lider"],
}


class SpreadsheetParser:
    """
    Leitura e parsing seguro de planilhas.
    
    Princípios:
    - Nunca executar fórmulas Excel
    - Sanitizar todo texto lido
    - Validar tipos antes de salvar
    - Erros por linha, não por arquivo inteiro
    """

    @staticmethod
    def _sanitize_string(value: Any) -> Optional[str]:
        """
        Sanitiza valor de célula de texto.
        Remove: fórmulas Excel, scripts, tags HTML, chars de controle.
        """
        if value is None or (isinstance(value, float) and np.isnan(value)):
            return None

        text = str(value).strip()

        # Bloqueia fórmulas Excel — vetor de ataque comum em CSV injection
        if text.startswith(("=", "+", "-", "@", "\t", "\r")):
            return None  # Descarta silenciosamente

        # Remove tags HTML/XML
        text = re.sub(r"<[^>]+>", "", text)

        # Remove caracteres de controle (exceto espaço normal)
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

        # Limita tamanho
        return text[:500] if text else None

    @staticmethod
    def _parse_salary(value: Any) -> Optional[Decimal]:
        """
        Converte valor de salário para Decimal.
        Aceita: 5000, 5.000,00, 5000.00, R$ 5.000,00
        """
        if value is None or (isinstance(value, float) and np.isnan(value)):
            return None

        if isinstance(value, (int, float)):
            try:
                d = Decimal(str(round(float(value), 2)))
                return d if d > 0 else None
            except InvalidOperation:
                return None

        # Remove formatação: R$, espaços, pontos de milhar
        text = str(value).strip()
        text = re.sub(r"[R$\s]", "", text)
        text = re.sub(r"\.", "", text)   # Remove ponto de milhar brasileiro
        text = text.replace(",", ".")    # Vírgula decimal → ponto

        try:
            d = Decimal(text)
            return d if d > 0 else None
        except InvalidOperation:
            return None

    @staticmethod
    def _parse_date(value: Any) -> Optional[date]:
        """Tenta converter valor em data com múltiplos formatos."""
        if value is None:
            return None

        if isinstance(value, date):
            return value

        if isinstance(value, float) and np.isnan(value):
            return None

        text = str(value).strip()
        formats = ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%y"]

        for fmt in formats:
            try:
                return pd.to_datetime(text, format=fmt).date()
            except Exception:
                continue

        return None

    @classmethod
    def _read_dataframe(cls, content: bytes, extension: str) -> pd.DataFrame:
        """
        Lê o arquivo para DataFrame de forma segura.
        engine='openpyxl' — nunca executar macros.
        """
        buffer = io.BytesIO(content)

        if extension == "xlsx":
            df = pd.read_excel(
                buffer,
                engine="openpyxl",      # Seguro — não executa macros
                dtype=str,              # Lê tudo como string — converte depois
                keep_default_na=False,  # Não converte strings vazias em NaN
                header=0,               # Primeira linha = cabeçalho
            )
        else:  # csv
            # Tenta detectar encoding e separador
            try:
                df = pd.read_csv(
                    buffer,
                    dtype=str,
                    keep_default_na=False,
                    sep=None,          # Detecta separador automaticamente
                    engine="python",
                    encoding="utf-8",
                )
            except UnicodeDecodeError:
                buffer.seek(0)
                df = pd.read_csv(
                    buffer,
                    dtype=str,
                    keep_default_na=False,
                    sep=None,
                    engine="python",
                    encoding="latin-1",
                )

        return df

    @classmethod
    def _normalize_column_name(cls, col: str) -> str:
        """Normaliza nome de coluna para comparação."""
        return (
            col.lower()
            .strip()
            .replace("  ", " ")
            .replace("_", " ")
        )

    @classmethod
    def detect_columns(
        cls,
        content: bytes,
        extension: str,
        file_id: str,
    ) -> ColumnDetectionResult:
        """
        Detecta colunas da planilha e sugere mapeamentos.
        Retorna preview das primeiras 5 linhas.
        """
        df = cls._read_dataframe(content, extension)

        # Remove colunas completamente vazias
        df = df.dropna(axis=1, how="all")
        df.columns = [str(c).strip() for c in df.columns]

        detected = list(df.columns)
        suggested: List[ColumnMapping] = []

        # Tenta mapear automaticamente por similaridade de nome
        for col in detected:
            col_norm = cls._normalize_column_name(col)
            matched_field = None

            for field, hints in COLUMN_HINTS.items():
                if any(hint in col_norm or col_norm in hint for hint in hints):
                    matched_field = field
                    break

            if matched_field:
                suggested.append(ColumnMapping(
                    source_column=col,
                    target_field=matched_field,
                    is_required=matched_field in {"name", "position_title", "current_salary"},
                ))

        # Preview — primeiras 5 linhas sanitizadas
        preview_rows = []
        for _, row in df.head(5).iterrows():
            preview_rows.append({
                col: cls._sanitize_string(val) or ""
                for col, val in row.items()
            })

        return ColumnDetectionResult(
            file_id=file_id,
            detected_columns=detected,
            suggested_mappings=suggested,
            preview_rows=preview_rows,
            total_rows=len(df),
        )

    @classmethod
    def parse_employees(
        cls,
        content: bytes,
        extension: str,
        mappings: List[ColumnMapping],
    ) -> Tuple[List[Dict[str, Any]], List[RowError]]:
        """
        Importa colaboradores da planilha usando mapeamento confirmado.
        
        Retorna:
        - Lista de dicts válidos (prontos para salvar)
        - Lista de erros por linha
        """
        df = cls._read_dataframe(content, extension)
        df.columns = [str(c).strip() for c in df.columns]

        # Monta mapa: coluna_planilha → campo_sistema
        col_map = {m.source_column: m.target_field for m in mappings}
        required_fields = {m.target_field for m in mappings if m.is_required}

        valid_rows: List[Dict[str, Any]] = []
        errors: List[RowError] = []

        for idx, row in df.iterrows():
            row_num = int(idx) + 2  # +2: linha 1 é cabeçalho, idx começa em 0
            row_data: Dict[str, Any] = {}
            row_errors: List[RowError] = []

            for source_col, target_field in col_map.items():
                if source_col not in df.columns:
                    continue

                raw_value = row.get(source_col)

                # Converte conforme o campo de destino
                if target_field == "current_salary":
                    parsed = cls._parse_salary(raw_value)
                    if parsed is None and target_field in required_fields:
                        row_errors.append(RowError(
                            row_number=row_num,
                            column=source_col,
                            value=str(raw_value)[:50],
                            reason="Salário inválido ou não informado",
                        ))
                    else:
                        row_data[target_field] = parsed

                elif target_field == "hire_date":
                    row_data[target_field] = cls._parse_date(raw_value)

                else:
                    sanitized = cls._sanitize_string(raw_value)
                    if sanitized is None and target_field in required_fields:
                        row_errors.append(RowError(
                            row_number=row_num,
                            column=source_col,
                            value=str(raw_value)[:50],
                            reason=f"Campo obrigatório '{target_field}' não informado",
                        ))
                    else:
                        row_data[target_field] = sanitized

            if row_errors:
                errors.extend(row_errors)
            elif row_data.get("name") or row_data.get("position_title"):
                valid_rows.append(row_data)

        return valid_rows, errors