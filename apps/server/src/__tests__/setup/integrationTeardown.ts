import { disconnectTestPrisma } from '../helpers/testDb';

afterAll(async () => {
  await disconnectTestPrisma();
});
