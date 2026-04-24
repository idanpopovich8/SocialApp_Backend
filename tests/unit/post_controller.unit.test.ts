import { getAllPosts } from '../../src/controllers/post_controller';
import PostModel from '../../src/models/post_model';

jest.mock('../../src/models/post_model', () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
    find: jest.fn(),
  },
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('post_controller unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 on invalid limit', async () => {
    const req: any = { query: { limit: '0', skip: '0' } };
    const res = mockResponse();
    const next = jest.fn();

    await getAllPosts(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('returns paginated posts response', async () => {
    (PostModel.countDocuments as jest.Mock).mockResolvedValue(1);
    const post = {
      _id: { toString: () => 'p1' },
      content: 'post',
      image: '',
      createdAt: new Date(),
      likesCount: 0,
      likes: [],
      comments: [],
      createdBy: {
        _id: { toString: () => 'u1' },
        fullName: 'User',
        image: '',
      },
    };
    const chain: any = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockResolvedValue([post]),
    };
    (PostModel.find as jest.Mock).mockReturnValue(chain);

    const req: any = { query: { limit: '10', skip: '0' } };
    const res = mockResponse();
    const next = jest.fn();

    await getAllPosts(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 1,
        hasMore: false,
        limit: 10,
        skip: 0,
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
