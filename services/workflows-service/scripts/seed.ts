import { PrismaClient, Customer, Project, User } from '@prisma/client';
import { hash } from 'bcrypt';
import { env } from '../src/env';

async function seed() {
  console.info('Seeding database...');
  const client = new PrismaClient();

  try {
    // Create customer
    const customer = await createCustomer(client, env.API_KEY);

    // Create project
    const project = await createProject(client, customer);

    // Create admin user
    await createAdminUser(client, project);

    console.info('Seeded database successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await client.$disconnect();
  }
}

async function createCustomer(client: PrismaClient, apiKey: string): Promise<Customer> {
  const existingCustomer = await client.customer.findUnique({ where: { id: 'customer-1' } });

  if (existingCustomer) {
    console.info('Customer already exists, skipping creation');
    return existingCustomer;
  }

  return client.customer.create({
    data: {
      id: 'customer-1',
      name: 'Vaultpay',
      displayName: 'Vaultpay',
      apiKeys: {
        create: {
          hashedKey: apiKey, // In a real scenario, you'd want to hash this
        },
      },
      authenticationConfiguration: {
        webhookSharedSecret: `webhook-shared-secret-${apiKey}`,
      },
      logoImageUri:
        'https://raw.githubusercontent.com/vault-pay/logo/5e7d20a78483f5842f9423cf5eb672e53f511dff/vaultpay-new-logo-large.svg',
      country: 'GB',
      language: 'en',
      config: {
        isMerchantMonitoringEnabled: true,
        isExample: true,
      },
    },
  });
}

async function createProject(client: PrismaClient, customer: Customer): Promise<Project> {
  const existingProject = await client.project.findUnique({ where: { id: 'project-1' } });

  if (existingProject) {
    console.info('Project already exists, skipping creation');
    return existingProject;
  }

  return client.project.create({
    data: {
      id: 'project-1',
      name: 'Project 1',
      customerId: customer.id,
    },
  });
}

async function createAdminUser(client: PrismaClient, project: Project): Promise<User> {
  const existingUser = await client.user.findUnique({ where: { email: 'admin@vaultpay.io' } });

  if (existingUser) {
    console.info('Admin user already exists, skipping creation');
    return existingUser;
  }

  const hashedPassword = await hash('admin', env.BCRYPT_SALT);

  return client.user.create({
    data: {
      email: 'admin@vaultpay.io',
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      roles: ['admin'],
      userToProjects: {
        create: { projectId: project.id },
      },
    },
  });
}

seed().catch(error => {
  console.error(error);
  process.exit(1);
});
