import { postAssist } from '../../src/controllers/ai_controller';
import { generatePostAssist } from '../../src/services/ai_post_assist_service';

jest.mock('../../src/services/ai_post_assist_service', () => ({
  __esModule: true,
  generatePostAssist: jest.fn(),
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ai_controller unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when draft invalid', async () => {
    const req: any = { user: { _id: 'u1' }, body: { draft: 'short' } };
    const res = mockResponse();
    const next = jest.fn();

    await postAssist(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('returns 400 when draft too long', async () => {
    const req: any = { user: { _id: 'u1' }, body: { draft: 'a'.repeat(5001) } };
    const res = mockResponse();
    const next = jest.fn();

    await postAssist(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].status).toBe(400);
  });

  it('returns AI suggestion on success', async () => {
    (generatePostAssist as jest.Mock).mockResolvedValue({
      originalText: 'a',
      improvedText: 'b',
      summary: 's',
      hashtags: ['#x'],
      category: 'general',
      improvementNotes: [],
    });
    const req: any = {
      user: { _id: 'u1' },
      body: { draft: 'this is a valid draft with enough chars' },
    };
    const res = mockResponse();
    const next = jest.fn();

    await postAssist(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'AI suggestion generated' }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
