import { editMessage } from '../../src/controllers/message_controller';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('message_controller unit', () => {
  it('returns 400 when content missing on edit', async () => {
    const req: any = {
      params: { messageId: '507f1f77bcf86cd799439011' },
      body: {},
      user: { _id: '507f1f77bcf86cd799439012' },
    };
    const res = mockResponse();
    const next = jest.fn();

    await editMessage(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].status).toBe(400);
  });
});
