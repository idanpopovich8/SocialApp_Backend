import { getProfile, updateProfile } from '../../src/controllers/user_controller';
import UserModel from '../../src/models/user_model';

jest.mock('../../src/models/user_model', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
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
});
