import { Module } from '@nestjs/common';
import { DocxImportService } from './docx-import.service';
import { PdfImportService } from './pdf-import.service';

/**
 * Provides the DOCX and PDF import services so they can be resolved from the
 * import module via `moduleRef.get(Service, { strict: false })`. Imported by
 * `EeModule`, which `AppModule` conditionally loads in the enterprise build.
 */
@Module({
  providers: [DocxImportService, PdfImportService],
  exports: [DocxImportService, PdfImportService],
})
export class DocumentImportModule {}
