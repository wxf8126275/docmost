import { EnvironmentService } from "./environment.service";

function makeService(getImpl: (key: string, def?: string) => string | undefined) {
  const configService = { get: jest.fn(getImpl) } as any;
  return new EnvironmentService(configService);
}

describe("EnvironmentService.getFileUploadSizeLimit", () => {
  it("falls back to 50mb when the value is empty", () => {
    const service = makeService(() => "");
    expect(service.getFileUploadSizeLimit()).toBe("50mb");
  });

  it("falls back to 50mb when the value is whitespace", () => {
    const service = makeService(() => "   ");
    expect(service.getFileUploadSizeLimit()).toBe("50mb");
  });

  it("falls back to 50mb when the value is 0", () => {
    const service = makeService(() => "0");
    expect(service.getFileUploadSizeLimit()).toBe("50mb");
  });

  it("honors a valid config value", () => {
    const service = makeService(() => "100mb");
    expect(service.getFileUploadSizeLimit()).toBe("100mb");
  });
});

describe("EnvironmentService.getFileImportSizeLimit", () => {
  it("falls back to 200mb when the value is empty", () => {
    const service = makeService(() => "");
    expect(service.getFileImportSizeLimit()).toBe("200mb");
  });

  it("honors a valid config value", () => {
    const service = makeService(() => "500mb");
    expect(service.getFileImportSizeLimit()).toBe("500mb");
  });
});
