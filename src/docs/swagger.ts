const baseUrl = process.env.BASE_URL || 'http://localhost:5001';

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SocialApp Backend API',
    version: '1.0.0',
    description: 'REST API documentation for SocialApp project.',
  },
  servers: [{ url: baseUrl }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          fullName: { type: 'string' },
          email: { type: 'string' },
          image: { type: 'string' },
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
        },
      },
      UserProfileResponse: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          fullName: { type: 'string' },
          email: { type: 'string' },
          image: { type: 'string' },
          onlineStatus: {
            type: 'string',
            enum: ['online', 'away', 'offline'],
          },
          lastSeen: { type: 'string', format: 'date-time', nullable: true },
          message: { type: 'string' },
        },
      },
      UserSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          fullName: { type: 'string' },
          image: { type: 'string' },
        },
      },
      Comment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          content: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          createdBy: { $ref: '#/components/schemas/UserSummary' },
        },
      },
      Post: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          content: { type: 'string' },
          image: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          commentsCount: { type: 'number' },
          likesCount: { type: 'number' },
          likes: {
            type: 'array',
            items: { type: 'string' },
          },
          comments: {
            type: 'array',
            items: { $ref: '#/components/schemas/Comment' },
          },
          createdBy: { $ref: '#/components/schemas/UserSummary' },
        },
      },
      PaginatedPostsResponse: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/Post' },
          },
          total: { type: 'number' },
          hasMore: { type: 'boolean' },
          limit: { type: 'number' },
          skip: { type: 'number' },
        },
      },
      Conversation: {
        type: 'object',
        properties: {
          conversationId: { type: 'string' },
          participants: {
            type: 'array',
            items: { type: 'object' },
          },
          lastMessage: { type: 'object', nullable: true },
          updatedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          messageId: { type: 'string' },
          conversationId: { type: 'string' },
          content: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AIPostAssistRequest: {
        type: 'object',
        required: ['draft'],
        properties: {
          draft: { type: 'string', minLength: 10 },
          intent: {
            type: 'string',
            enum: ['help-request', 'offer-help', 'general'],
          },
          tone: { type: 'string', enum: ['friendly', 'formal', 'short'] },
        },
      },
      AIPostAssistResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              originalText: { type: 'string' },
              improvedText: { type: 'string' },
              summary: { type: 'string' },
              hashtags: { type: 'array', items: { type: 'string' } },
              category: {
                type: 'string',
                enum: ['help-request', 'offer-help', 'general'],
              },
              improvementNotes: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'password'],
                properties: {
                  fullName: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Google signin',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['credential'],
                properties: {
                  credential: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserProfileResponse' },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
      put: {
        tags: ['Auth'],
        summary: 'Update authenticated user profile (name/image)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  fullName: { type: 'string', minLength: 2 },
                  image: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserProfileResponse' },
              },
            },
          },
          '400': { description: 'Invalid input' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/posts': {
      get: {
        tags: ['Posts'],
        summary: 'Get all posts',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
          {
            name: 'skip',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 0, default: 0 },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaginatedPostsResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Posts'],
        summary: 'Create post',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/posts/{id}': {
      get: {
        tags: ['Posts'],
        summary: 'Get post by id',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['Posts'],
        summary: 'Update post',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['Posts'],
        summary: 'Delete post',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/posts/user/{userId}': {
      get: {
        tags: ['Posts'],
        summary: 'Get user posts',
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
          {
            name: 'skip',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 0, default: 0 },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaginatedPostsResponse' },
              },
            },
          },
        },
      },
    },
    '/api/posts/{id}/like': {
      post: {
        tags: ['Posts'],
        summary: 'Toggle like',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/comments/{postId}': {
      post: {
        tags: ['Comments'],
        summary: 'Create comment',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'postId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/comments/{id}': {
      put: {
        tags: ['Comments'],
        summary: 'Update comment',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['Comments'],
        summary: 'Delete comment',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/conversations': {
      post: {
        tags: ['Conversations'],
        summary: 'Create conversation',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Created' } },
      },
      get: {
        tags: ['Conversations'],
        summary: 'Get user conversations',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/conversations/{conversationId}': {
      get: {
        tags: ['Conversations'],
        summary: 'Get conversation details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'conversationId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['Conversations'],
        summary: 'Leave conversation',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'conversationId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/conversations/{conversationId}/add-participant': {
      put: {
        tags: ['Conversations'],
        summary: 'Add participant',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'conversationId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/messages/conversations/{conversationId}': {
      get: {
        tags: ['Messages'],
        summary: 'Get conversation messages',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'conversationId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/messages/{messageId}': {
      get: {
        tags: ['Messages'],
        summary: 'Get single message',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'messageId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '403': { description: 'Forbidden' },
        },
      },
      put: {
        tags: ['Messages'],
        summary: 'Edit message',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'messageId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': { description: 'OK' } },
      },
      delete: {
        tags: ['Messages'],
        summary: 'Delete message',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'messageId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/ai/post-assist': {
      post: {
        tags: ['AI'],
        summary: 'Get AI rewrite suggestion for post draft',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AIPostAssistRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Suggestion generated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AIPostAssistResponse' },
              },
            },
          },
          '400': { description: 'Invalid input' },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limit reached' },
        },
      },
    },
  },
};
