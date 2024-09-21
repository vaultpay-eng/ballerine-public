import { PrismaClient, Customer, Project, User, WorkflowDefinition, Filter } from '@prisma/client';
import { hash } from 'bcrypt';
import { hashKey } from '../src/customer/api-key/utils';

import { env } from '../src/env';

async function seed() {
  console.info('Seeding database...');
  const client = new PrismaClient();

  try {
    const customer = await createCustomer(client, env.API_KEY);
    const project = await createProject(client, customer);
    await createAdminUser(client, project);
    await createWorkflowDefinition(client, project);
    await createFilter(client, project);

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
          hashedKey: await hashKey(apiKey),
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
      email: 'support@vaultpay.io',
      firstName: 'Support',
      lastName: 'Vaultpay',
      password: hashedPassword,
      roles: ['admin'],
      userToProjects: {
        create: { projectId: project.id },
      },
    },
  });
}

async function createWorkflowDefinition(
  client: PrismaClient,
  project: Project,
): Promise<WorkflowDefinition> {
  const existingWorkflow = await client.workflowDefinition.findUnique({
    where: { id: 'VAULTPAY_KYC_WORKFLOW_ID' },
  });

  if (existingWorkflow) {
    console.info('Workflow definition already exists, skipping creation');
    return existingWorkflow;
  }

  return client.workflowDefinition.create({
    data: {
      id: 'VAULTPAY_KYC_WORKFLOW_ID',
      name: 'VAULTPAY_KYC_WORKFLOW_ID',
      version: 1,
      projectId: project.id,
      isPublic: false,
      definitionType: 'statechart-json',
      definition: {
        id: 'Simple Manual Review',
        states: {
          approved: {
            tags: ['approved'],
            type: 'final',
          },
          rejected: {
            tags: ['rejected'],
            type: 'final',
          },
          manual_review: {
            on: {
              reject: 'rejected',
              approve: 'approved',
              revision: 'revision',
            },
            tags: ['manual_review'],
          },
          revision: {
            on: {
              RETURN_TO_REVIEW: 'manual_review',
            },
            tags: ['revision'],
          },
        },
        initial: 'manual_review',
      },
      config: {
        workflowLevelResolution: true,
      },
      extensions: {
        apiPlugins: [
          {
            name: 'webhook_final_results',
            url: 'https://play.svix.com/in/e_w7vKw2G5rKuoc3FgM3m0FcpLxNH/',
            method: 'POST',
            stateNames: ['revision'],
            request: {
              transform: [
                {
                  transformer: 'jmespath',
                  mapping: '{workflow_decision: state, data: @}',
                },
              ],
            },
          },
        ],
      },
      variant: 'DEFAULT',
      createdBy: 'SYSTEM',
    },
  });
}

async function createFilter(client: PrismaClient, project: Project): Promise<Filter> {
  const existingFilter = await client.filter.findFirst({
    where: {
      name: 'KYC - Vaultpay Users',
      projectId: project.id,
    },
  });

  if (existingFilter) {
    console.info('Filter already exists, skipping creation');
    return existingFilter;
  }

  return client.filter.create({
    data: {
      name: 'KYC - Vaultpay Users',
      entity: 'individuals',
      query: {
        where: {
          endUserId: {
            not: null,
          },
          workflowDefinitionId: {
            in: ['VAULTPAY_KYC_WORKFLOW_ID'],
          },
        },
        select: {
          id: true,
          tags: true,
          state: true,
          status: true,
          context: true,
          endUser: {
            select: {
              id: true,
              email: true,
              phone: true,
              lastName: true,
              avatarUrl: true,
              createdAt: true,
              firstName: true,
              updatedAt: true,
              dateOfBirth: true,
              endUserType: true,
              stateReason: true,
              approvalState: true,
              correlationId: true,
              additionalInfo: true,
            },
          },
          assignee: {
            select: {
              id: true,
              lastName: true,
              avatarUrl: true,
              firstName: true,
            },
          },
          createdAt: true,
          assigneeId: true,
          workflowDefinition: {
            select: {
              id: true,
              name: true,
              config: true,
              variant: true,
              version: true,
              definition: true,
              contextSchema: true,
              documentsSchema: true,
            },
          },
        },
      },
      projectId: project.id,
    },
  });
}

seed().catch(error => {
  console.error(error);
  process.exit(1);
});
