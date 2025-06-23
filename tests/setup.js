process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://testuser:testpass@localhost:5432/testdb'; // Add a dummy DB URL for tests
process.env.JWT_SECRET = 'test_jwt_secret'; // Add a dummy JWT secret for tests
