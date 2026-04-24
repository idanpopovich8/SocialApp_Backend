const multerMock = jest.fn((config) => config);
const diskStorageMock = jest.fn((config) => config);

jest.mock('multer', () => {
  const mocked: any = (config: unknown) => multerMock(config);
  mocked.diskStorage = (config: unknown) => diskStorageMock(config);
  return mocked;
});

import { uploadMiddleware } from '../../src/middleware/upload_middleware';

describe('upload_middleware unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('configures 5MB file size limit', () => {
    const config: any = uploadMiddleware('posts');
    expect(config.limits.fileSize).toBe(1024 * 1024 * 5);
  });

  it('accepts image mime types', () => {
    const config: any = uploadMiddleware('users');
    const cb = jest.fn();

    config.fileFilter({}, { mimetype: 'image/png' }, cb);

    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('rejects non-image mime types', () => {
    const config: any = uploadMiddleware('users');
    const cb = jest.fn();

    config.fileFilter({}, { mimetype: 'text/plain' }, cb);

    const err = cb.mock.calls[0][0] as Error;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('Only images are allowed');
  });
});
