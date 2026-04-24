const verifyIdTokenMock = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: verifyIdTokenMock,
  })),
}));

import {
  getProfile,
  updateProfile,
  googleSignin,
} from '../../src/controllers/user_controller';
import UserModel from '../../src/models/user_model';

jest.mock('../../src/models/user_model', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('user_controller unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'unit-secret';
    process.env.JWT_REFRESH_SECRET = 'unit-refresh-secret';
    process.env.GOOGLE_CLIENT_ID = 'unit-google-client-id';
  });

  it('getProfile returns 401 when user missing', async () => {
    const req: any = { user: undefined };
    const res = mockResponse();
    const next = jest.fn();

    await getProfile(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].status).toBe(401);
  });

  it('updateProfile updates name successfully', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    (UserModel.findById as jest.Mock).mockResolvedValue({
      _id: { toString: () => 'u1' },
      fullName: 'Old Name',
      email: 'u@example.com',
      image: '',
      onlineStatus: 'offline',
      lastSeen: null,
      save,
    });

    const req: any = {
      user: { _id: 'u1' },
      body: { fullName: 'New Name' },
    };
    const res = mockResponse();
    const next = jest.fn();

    await updateProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'New Name',
        message: 'Profile updated successfully',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('googleSignin returns 400 when credential missing', async () => {
    const req: any = { body: {} };
    const res = mockResponse();
    const next = jest.fn();

    await googleSignin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('googleSignin handles invalid payload', async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ name: 'No Email' }),
    });
    const req: any = { body: { credential: 'token' } };
    const res = mockResponse();
    const next = jest.fn();

    await googleSignin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('googleSignin returns tokens for existing user', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ email: 'u@example.com', name: 'Google User' }),
    });
    (UserModel.findOne as jest.Mock).mockResolvedValue({
      _id: { toString: () => 'u1' },
      fullName: 'Existing User',
      email: 'u@example.com',
      image: '',
      refreshTokens: [],
      save,
    });

    const req: any = { body: { credential: 'token' } };
    const res = mockResponse();
    const next = jest.fn();

    await googleSignin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.anything(),
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('googleSignin creates user when not exists', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        email: 'new@example.com',
        name: 'New User',
        picture: 'http://img',
      }),
    });
    (UserModel.findOne as jest.Mock).mockResolvedValue(null);
    (UserModel.create as jest.Mock).mockResolvedValue({
      _id: { toString: () => 'u2' },
      fullName: 'New User',
      email: 'new@example.com',
      image: 'http://img',
      refreshTokens: [],
      save,
    });

    const req: any = { body: { credential: 'token' } };
    const res = mockResponse();
    const next = jest.fn();

    await googleSignin(req, res, next);

    expect(UserModel.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});
