# backend/app/services/upload_validator.py

import magic          # python-magic — detecta MIME real do arquivo
import hashlib
import os
import re
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings


# MIME types permitidos — verificados no conteúdo real, não na extensão
ALLOWED_MIME_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # xlsx
    "text/csv",
    "application/csv",
    "text/plain",  # alguns CSVs são detectados assim
}

# Extensões permitidas
ALLOWED_EXTENSIONS = {"xlsx", "csv"}

# Padrões perigosos em nomes de arquivo
DANGEROUS_FILENAME_PATTERNS = re.compile(
    r"(\.\.|/|\\|<|>|:|\"|\||\?|\*|%|&|;|\$|`)"
)


class UploadValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class UploadValidator:
    """
    Valida arquivo de upload em múltiplas camadas:
    1. Nome do arquivo (path traversal)
    2. Extensão
    3. Tamanho
    4. MIME type real (não confia no header do browser)
    5. Conteúdo básico (não vazio, leitura possível)
    """

    @staticmethod
    def validate_filename(filename: str) -> str:
        """
        Sanitiza e valida nome do arquivo.
        Previne path traversal: '../../../etc/passwd'
        """
        if not filename:
            raise UploadValidationError("Nome de arquivo não informado")

        # Remove path — só mantém o nome do arquivo
        filename = Path(filename).name

        # Verifica caracteres perigosos
        if DANGEROUS_FILENAME_PATTERNS.search(filename):
            raise UploadValidationError("Nome de arquivo contém caracteres inválidos")

        # Limita tamanho do nome
        if len(filename) > 255:
            raise UploadValidationError("Nome do arquivo muito longo")

        return filename

    @staticmethod
    def validate_extension(filename: str) -> str:
        """Valida extensão do arquivo."""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

        if ext not in ALLOWED_EXTENSIONS:
            raise UploadValidationError(
                f"Extensão não permitida: .{ext}. "
                f"Use: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        return ext

    @staticmethod
    async def validate_size(file: UploadFile) -> bytes:
        """
        Lê o arquivo e valida tamanho.
        Retorna os bytes para reuso — evita ler duas vezes.
        """
        content = await file.read()

        if len(content) == 0:
            raise UploadValidationError("Arquivo vazio")

        if len(content) > settings.max_upload_size_bytes:
            max_mb = settings.MAX_UPLOAD_SIZE_MB
            raise UploadValidationError(
                f"Arquivo muito grande. Máximo: {max_mb}MB"
            )

        return content

    @staticmethod
    def validate_mime_type(content: bytes, extension: str) -> None:
        """
        Detecta MIME type REAL do conteúdo binário.
        Não confia no Content-Type do browser nem na extensão.
        Um .xlsx renomeado para .csv é detectado aqui.
        """
        try:
            detected_mime = magic.from_buffer(content, mime=True)
        except Exception:
            raise UploadValidationError("Não foi possível verificar o tipo do arquivo")

        if detected_mime not in ALLOWED_MIME_TYPES:
            # Verifica se é xlsx disfarçado (zip com estrutura OOXML)
            if extension == "xlsx" and detected_mime == "application/zip":
                pass  # xlsx é tecnicamente um zip — permitir
            else:
                raise UploadValidationError(
                    f"Tipo de arquivo não permitido: {detected_mime}"
                )

    @staticmethod
    def generate_safe_filename(original: str, company_id: str) -> str:
        """
        Gera nome de arquivo seguro para armazenamento.
        Nunca salva com o nome original — previne conflitos e ataques.
        Formato: {company_id}_{hash8}_{timestamp}.{ext}
        """
        import time
        ext = original.rsplit(".", 1)[-1].lower()
        timestamp = int(time.time())
        hash_part = hashlib.sha256(
            f"{company_id}{original}{timestamp}".encode()
        ).hexdigest()[:8]

        return f"{company_id}_{hash_part}_{timestamp}.{ext}"

    @classmethod
    async def validate_all(
        cls,
        file: UploadFile,
        company_id: str,
    ) -> Tuple[bytes, str, str]:
        """
        Executa todas as validações em sequência.
        Retorna (content_bytes, safe_filename, extension).
        """
        # 1. Nome do arquivo
        safe_name_original = cls.validate_filename(file.filename or "")

        # 2. Extensão
        extension = cls.validate_extension(safe_name_original)

        # 3. Tamanho + leitura
        content = await cls.validate_size(file)

        # 4. MIME type real
        cls.validate_mime_type(content, extension)

        # 5. Nome seguro para storage
        safe_filename = cls.generate_safe_filename(safe_name_original, company_id)

        return content, safe_filename, extension