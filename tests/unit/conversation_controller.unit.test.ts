import { createConversation } from '../../src/controllers/conversation_controller';
import ConversationModel from '../../src/models/conversation_model';

jest.mock('../../src/models/conversation_model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('conversation_controller unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for invalid participantIds payload', async () => {
    const req: any = { user: { _id: 'u1' }, body: { participantIds: 'bad' } };
    const res = mockResponse();
    const next = jest.fn();

    await createConversation(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('creates conversation successfully', async () => {
    (ConversationModel.create as jest.Mock).mockResolvedValue({
      _id: { toString: () => 'conv1' },
      participants: [],
      createdAt: new Date(),
      populate: jest.fn().mockResolvedValue(undefined),
    });
    const req: any = {
      user: { _id: '507f1f77bcf86cd799439011' },
      body: { participantIds: ['507f1f77bcf86cd799439012'] },
    };
    const res = mockResponse();
    const next = jest.fn();

    await createConversation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv1' }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
