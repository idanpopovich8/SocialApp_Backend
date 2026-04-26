import { createConversation } from '../../src/controllers/conversation_controller';
import ConversationModel from '../../src/models/conversation_model';

jest.mock('../../src/models/conversation_model', () => ({
  __esModule: true,
  default: {
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
    (ConversationModel.findOne as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });
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

  it('reuses existing conversation when same participants already exist', async () => {
    (ConversationModel.findOne as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: { toString: () => 'conv-existing' },
        participants: [],
        createdAt: new Date(),
      }),
    });
    const req: any = {
      user: { _id: '507f1f77bcf86cd799439011' },
      body: { participantIds: ['507f1f77bcf86cd799439012'] },
    };
    const res = mockResponse();
    const next = jest.fn();

    await createConversation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-existing',
        message: 'Conversation already exists',
      }),
    );
    expect(ConversationModel.create).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
