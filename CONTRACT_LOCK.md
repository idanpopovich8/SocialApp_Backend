# Backend Contract Lock (Stage 4)

This document defines the locked backend contract for frontend integration.

## 1) Global Rules

- Base path: `/api`
- Auth: `Authorization: Bearer <accessToken>`
- Error format:

```json
{ "message": "Error message" }
```

- Pagination:
  - Conversations list: `limit`, `skip`
  - Conversation details: `messageLimit`, `messageSkip`
  - Messages list: `limit`, `skip`

## 2) Auth Contract

### `POST /api/auth/register`
- Body:
  - `fullName: string`
  - `email: string`
  - `password: string`
  - optional file `image` (multipart)
- Response `201`:
  - `id, fullName, image, email, accessToken, refreshToken`

### `POST /api/auth/login`
- Body: `email, password`
- Response `200`: `id, fullName, image, email, accessToken, refreshToken`

### `POST /api/auth/logout`
- Body: `refreshToken`
- Response `200`: `{ "message": "Logged out successfully" }`

### `POST /api/auth/refresh`
- Body: `refreshToken`
- Response `200`: `{ "accessToken": "...", "refreshToken": "..." }`

### `POST /api/auth/google`
- Body: `credential`
- Response `200`: same shape as login/register

## 3) Post Contract

### `GET /api/posts`
- Public
- Response `200`: `Post[]`

### `GET /api/posts/:id`
- Public
- Response `200`: `Post`

### `GET /api/posts/user/:userId`
- Public
- Response `200`: `Post[]`

### `POST /api/posts`
- Auth required
- Body: `content`, optional file `image` (multipart)
- Response `201`: created `Post`

### `PUT /api/posts/:id`
- Auth required, owner only
- Body: optional `content`, optional file `image`
- Response `200`: updated `Post`

### `DELETE /api/posts/:id`
- Auth required, owner only
- Response `200`: `{ "message": "Post deleted successfully" }`

### `POST /api/posts/:id/like`
- Auth required
- Response `200`: `{ "message": string, "liked": boolean, "likesCount": number }`

## 4) Comment Contract

### `POST /api/comments/:postId`
- Auth required
- Body: `content`
- Response `201`: `Comment`

### `PUT /api/comments/:id`
- Auth required, owner only
- Body: `content`
- Response `200`: `Comment`

### `DELETE /api/comments/:id`
- Auth required, owner only
- Response `200`: `{ "message": "Comment deleted successfully" }`

## 5) Conversation Contract

All conversation routes require auth.

### `POST /api/conversations`
- Body: `{ "participantIds": string[] }`
- Response `201`: `{ "conversationId": string, "participants": User[], "createdAt": string }`

### `GET /api/conversations?limit=&skip=`
- Response `200`:
  - `conversations: ConversationSummary[]`
  - `total: number`
  - `hasMore: boolean`

### `GET /api/conversations/:conversationId?messageLimit=&messageSkip=`
- Participant only
- Response `200`:
  - `conversationId`
  - `participants`
  - `messages`
  - `totalMessages`
  - `hasMore`
  - `createdAt`
  - `updatedAt`

### `PUT /api/conversations/:conversationId/add-participant`
- Participant only
- Body: `{ "newUserId": string }`
- Response `200`: `{ "conversationId", "participants", "message" }`

### `DELETE /api/conversations/:conversationId`
- Participant only
- Response `200`: `{ "message": "Left conversation successfully", "conversationId": string }`

## 6) Message Contract

All message routes require auth.

### `GET /api/messages/conversations/:conversationId?limit=&skip=`
- Participant only
- Response `200`:
  - `messages: Message[]`
  - `conversationId`
  - `hasMore`
  - `totalCount`

### `GET /api/messages/:messageId`
- Participant only
- Response `200`: single message payload

### `PUT /api/messages/:messageId`
- Sender only
- Body: `{ "content": string }`
- Response `200`: `{ "messageId", "conversationId", "content", "updatedAt" }`

### `DELETE /api/messages/:messageId`
- Sender only
- Response `200`: `{ "messageId", "conversationId", "message" }`

## 7) Socket Contract

Auth: JWT token in handshake (`auth.token` or query token).

### Conversation events
- Client emit:
  - `conversation:create` `{ participantIds: string[] }`
  - `conversation:join` `{ conversationId: string }`
  - `conversation:leave` `{ conversationId: string }`
  - `conversation:addUser` `{ conversationId: string, newUserId: string }`
  - `conversation:removeUser` `{ conversationId: string, userId: string }`
- Server emit:
  - `conversation:created`
  - `user:leftConversation`
  - `conversation:userAdded`
  - `conversation:userRemoved`

### Message events
- Client emit:
  - `message:send` `{ conversationId: string, content: string }`
  - `message:loadHistory` `{ conversationId: string, limit?: number, skip?: number }`
  - `message:edit` `{ messageId: string, content: string, conversationId: string }`
  - `message:delete` `{ messageId: string, conversationId: string }`
- Server emit:
  - `message:received`
  - `message:updated`
  - `message:deleted`

### Presence events
- Client emit:
  - `user:online`
  - `user:away`
  - `user:typing` `{ conversationId: string, isTyping: boolean }`
- Server emit:
  - `user:statusChanged`
  - `user:typing`

### Socket callback shape

```json
{ "success": true, "message": {} }
```

or

```json
{ "success": false, "error": "..." }
```

## 8) Locked DTO Shape (Frontend Mapping)

### `UserSummary`
- `id: string`
- `fullName: string`
- `image?: string`

### `Comment`
- `id: string`
- `content: string`
- `createdAt: string`
- `createdBy: UserSummary`

### `Post`
- `id: string`
- `content: string`
- `image?: string`
- `createdAt: string`
- `likes: string[]`
- `likesCount: number`
- `comments: Comment[]`
- `commentsCount: number`
- `createdBy: UserSummary`

### `Message`
- `messageId: string`
- `conversationId: string`
- `content: string`
- `createdAt?: string`
- `updatedAt?: string`
- `senderId?: string | object`
- `sender?: object`

### `ConversationSummary`
- `conversationId: string`
- `participants: object[]`
- `lastMessage?: object | null`
- `lastMessageAt?: string | null`
- `updatedAt: string`
- `createdAt: string`

## 9) Known Edge Cases

- Missing auth token -> `401`
- Invalid/expired token -> `401`
- Non-participant message/conversation access -> `403`
- Missing entity -> `404`
- Invalid input IDs/body -> `400`
