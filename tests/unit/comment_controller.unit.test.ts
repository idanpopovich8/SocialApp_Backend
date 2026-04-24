import { createComment } from '../../src/controllers/comment_controller';
import CommentModel from '../../src/models/comment_model';
import PostModel from '../../src/models/post_model';

jest.mock('../../src/models/comment_model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock('../../src/models/post_model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('comment_controller unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when content missing', async () => {
    const req: any = {
      params: { postId: '507f1f77bcf86cd799439011' },
      body: {},
      user: { _id: '507f1f77bcf86cd799439012' },
    };
    const res = mockResponse();
    const next = jest.fn();

    await createComment(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('creates comment successfully', async () => {
    (PostModel.findOne as jest.Mock).mockResolvedValue({ _id: 'p1' });
    const createdAt = new Date();
    (CommentModel.create as jest.Mock).mockResolvedValue({
      _id: { toString: () => 'c1' },
      content: 'hello',
      createdAt,
      createdBy: {
        _id: { toString: () => 'u1' },
        fullName: 'User',
        image: '',
      },
      populate: jest.fn().mockResolvedValue(undefined),
    });

    const req: any = {
      params: { postId: '507f1f77bcf86cd799439011' },
      body: { content: 'hello' },
      user: { _id: '507f1f77bcf86cd799439012' },
    };
    const res = mockResponse();
    const next = jest.fn();

    await createComment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1', content: 'hello' }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
