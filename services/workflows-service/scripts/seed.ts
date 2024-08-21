import { hashKey } from './../src/customer/api-key/utils';
import { faker } from '@faker-js/faker';
import { Business, Customer, EndUser, Prisma, PrismaClient, Project } from '@prisma/client';
import { hash } from 'bcrypt';
import { customSeed } from './custom-seed';
import {
  businessIds,
  businessRiskIds,
  endUserIds,
  generateBusiness,
  generateEndUser,
} from './generate-end-user';
import { CommonWorkflowStates, defaultContextSchema } from '@ballerine/common';
import { generateUserNationalId } from './generate-user-national-id';
import { generateDynamicDefinitionForE2eTest } from './workflows/e2e-dynamic-url-example';
import { generateKycForE2eTest } from './workflows/kyc-dynamic-process-example';
import { generateKybDefintion } from './workflows';
import { generateKycSessionDefinition } from './workflows/kyc-email-process-example';
import { env } from '../src/env';
import { generateKybKycWorkflowDefinition } from './workflows/kyb-kyc-workflow-definition';
import { generateBaseTaskLevelStates } from './workflows/generate-base-task-level-states';
import { generateBaseCaseLevelStatesAutoTransitionOnRevision } from './workflows/generate-base-case-level-states';
import type { InputJsonValue } from '../src/types';
import { generateWebsiteMonitoringExample } from './workflows/website-monitoring-workflow';
import { generateCollectionKybWorkflow } from './workflows/generate-collection-kyb-workflow';
import { generateInitialCollectionFlowExample } from './workflows/runtime/generate-initial-collection-flow-example';
import { uiKybParentWithAssociatedCompanies } from './workflows/ui-definition/kyb-with-associated-companies/ui-kyb-parent-dynamic-example';
import {
  baseFilterAssigneeSelect,
  baseFilterBusinessSelect,
  baseFilterDefinitionSelect,
  baseFilterEndUserSelect,
} from './filters';
import { generateTransactions } from './alerts/generate-transactions';
import { generateKycManualReviewRuntimeAndToken } from './workflows/runtime/geneate-kyc-manual-review-runtime-and-token';
import { Type } from '@sinclair/typebox';
import { generateFakeAlertsAndDefinitions as generateFakeAlertDefinitions } from './alerts/generate-alerts';

const BCRYPT_SALT: string | number = 10;

seed().catch(error => {
  console.error(error);
  process.exit(1);
});

const persistImageFile = async (client: PrismaClient, uri: string, projectId: string) => {
  const file = await client.file.create({
    data: {
      userId: '',
      fileNameOnDisk: uri,
      uri: uri,
      projectId: projectId,
    },
  });

  return file.id;
};

function generateAvatarImageUri(imageTemplate: string, countOfBusiness: number, pdf = false) {
  if (pdf) {
    return `https://blrn-imgs.s3.eu-central-1.amazonaws.com/github/mock-pdf.pdf`;
  }

  if (countOfBusiness < 4) {
    return faker.image.business(1000, 2000, true);
  }

  return faker.image.people(1000, 2000, true);
}

//TODO Ntambwa: understand this file

async function createCustomer(
  client: PrismaClient,
  id: string,
  apiKey: string,
  logoImageUri: string,
  faviconImageUri: string,
  webhookSharedSecret: string,
) {
  return client.customer.create({
    data: {
      id: `customer-${id}`,
      name: `customer-${id}`,
      displayName: `Customer ${id}`,
      apiKeys: {
        create: {
          hashedKey: await hashKey(apiKey),
        },
      },
      authenticationConfiguration: {
        webhookSharedSecret,
      },
      logoImageUri: logoImageUri,
      faviconImageUri,
      country: 'GB',
      language: 'en',
    },
  });
}

async function createProject(client: PrismaClient, customer: Customer, id: string) {
  return client.project.create({
    data: {
      id: `project-${id}`,
      name: `Project ${id}`,
      customerId: customer.id,
    },
  });
}

const DEFAULT_INITIAL_STATE = CommonWorkflowStates.MANUAL_REVIEW;

const DEFAULT_TOKENS = {
  KYB: '12345678-1234-1234-1234-123456789012',
  KYC: '12345678-1234-1234-1234-123456789000',
};

async function seed() {
  console.info('Seeding database...');
  const client = new PrismaClient();
  // await generateDynamicDefinitionForE2eTest(client);
  const customer = (await createCustomer(
    client,
    '1',
    env.API_KEY,
    'https://blrn-cdn-prod.s3.eu-central-1.amazonaws.com/images/ballerine_logo.svg',
    '',
    `webhook-shared-secret-${env.API_KEY}`,
  )) as Customer;

  const project1 = (await createProject(client, customer, '1')) as Project;

  const ids1 = await generateTransactions(client, {
    projectId: project1.id,
  });

  const [adminUser, ...agentUsers] = await createUsers({ project1 }, client);

  const kycManualMachineId = 'MANUAL_REVIEW_0002zpeid7bq9aaa';
  const kybManualMachineId = 'MANUAL_REVIEW_0002zpeid7bq9bbb';
  const manualMachineVersion = 1;

  const kycWorkflowDefinitionId = 'kyc-manual-review';

  const onboardingMachineKycId = 'COLLECT_DOCS_b0002zpeid7bq9aaa';
  const onboardingMachineKybId = 'COLLECT_DOCS_b0002zpeid7bq9bbb';
  const riskScoreMachineKybId = 'risk-score-improvement-dev';

  // KYB Flows
  const onboardingMachineId = 'kyb-onboarding';
  const riskScoreMachineId = 'kyb-risk-score';

  async function createMockEndUserContextData(endUserId: string, countOfIndividual: number) {
    const correlationId = faker.datatype.uuid();
    const imageUri1 = generateAvatarImageUri(
      `set_${countOfIndividual}_doc_front.png`,
      countOfIndividual,
    );
    const imageUri2 = generateAvatarImageUri(
      `set_${countOfIndividual}_doc_face.png`,
      countOfIndividual,
    );
    const imageUri3 = generateAvatarImageUri(
      `set_${countOfIndividual}_selfie.png`,
      countOfIndividual,
      true,
    );

    return {
      entity: {
        type: 'individual',
        data: {
          firstName: 'Aime', //faker.name.firstName(),
          lastName: 'Tshibangu', //faker.name.lastName(),
          email: faker.internet.email(),
          approvalState: 'NEW',
          phone: faker.phone.number(),
          stateReason: 'Poor quality of documents',
          // @ts-expect-error - end user type expects a date and not a string.
          dateOfBirth: faker.date.past(20).toISOString(),
          additionalInfo: { customParam: 'customValue' },
        } satisfies Partial<EndUser>,
        ballerineEntityId: endUserId,
        id: correlationId,
      },
      documents: [
        {
          id: faker.datatype.uuid(),
          category: 'id',
          type: 'photo',
          issuer: {
            type: 'government',
            name: 'Government',
            country: 'CA',
            city: faker.address.city(),
            additionalInfo: { customParam: 'customValue' },
          },
          issuingVersion: 1,

          version: 1,
          pages: [
            {
              provider: 'http',
              uri: imageUri1,
              type: 'jpg',
              data: '',
              ballerineFileId: await persistImageFile(client, imageUri1, project1.id),
              metadata: {
                side: 'front',
                pageNumber: '1',
              },
            },
            {
              provider: 'http',
              uri: imageUri2,
              type: 'jpg',
              data: '',
              ballerineFileId: await persistImageFile(client, imageUri2, project1.id),
              metadata: {
                side: 'back',
                pageNumber: '1',
              },
            },
          ],
          properties: {
            firstName: faker.name.firstName(),
            middleName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            authority: faker.company.name(),
            placeOfIssue: faker.address.city(),
            issueDate: faker.date.past(10).toISOString().split('T')[0],
            expires: faker.date.future(10).toISOString().split('T')[0],
            dateOfBirth: faker.date.past(20).toISOString().split('T')[0],
            placeOfBirth: faker.address.city(),
            sex: faker.helpers.arrayElement(['male', 'female', 'other']),
          },
        },
        {
          id: faker.datatype.uuid(),
          category: 'selfie',
          type: 'photo',
          issuer: {
            type: 'government',
            name: 'Government',
            country: 'CA',
            city: faker.address.city(),
            additionalInfo: { customParam: 'customValue' },
          },
          issuingVersion: 1,

          version: 1,
          pages: [
            {
              provider: 'http',
              uri: imageUri3,
              type: 'image/png',
              data: '',
              ballerineFileId: await persistImageFile(client, imageUri3, project1.id),
              metadata: {},
            },
          ],
          properties: {
            firstName: faker.name.firstName(),
            middleName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            authority: faker.company.name(),
            placeOfIssue: faker.address.city(),
            issueDate: faker.date.past(10).toISOString().split('T')[0],
            expires: faker.date.future(10).toISOString().split('T')[0],
            dateOfBirth: faker.date.past(20).toISOString().split('T')[0],
            placeOfBirth: faker.address.city(),
            sex: faker.helpers.arrayElement(['male', 'female', 'other']),
          },
        },
      ],
    };
  }

  function createFilter(
    name: string,
    entity: 'individuals' | 'businesses',
    query: Prisma.WorkflowRuntimeDataFindManyArgs,
    projectId: string,
  ) {
    return client.filter.create({
      data: {
        entity,
        name,
        query: query as any,
        projectId: projectId,
      },
    });
  }

  const baseReviewDefinition = (stateDefinition: InputJsonValue) =>
    ({
      name: DEFAULT_INITIAL_STATE,
      version: manualMachineVersion,
      definitionType: 'statechart-json',
      config: {
        isLegacyReject: true,
        workflowLevelResolution: true,
      },
      definition: {
        id: 'Manual Review',
        initial: DEFAULT_INITIAL_STATE,
        states: stateDefinition,
      },
      persistStates: [],
      submitStates: [],
    } as const satisfies Prisma.WorkflowDefinitionUncheckedCreateInput);

  // KYC Manual Review (workflowLevelResolution false)
  await client.workflowDefinition.create({
    data: {
      ...baseReviewDefinition(generateBaseTaskLevelStates()),
      id: kycManualMachineId,
      config: {
        workflowLevelResolution: false,
      },
      version: 2,
      projectId: project1.id,
    },
  });

  // KYC
  await client.workflowDefinition.create({
    data: {
      id: onboardingMachineKycId, // should be auto generated normally
      reviewMachineId: kycManualMachineId,
      name: 'kyc',
      version: 1,
      definitionType: 'statechart-json',
      definition: {
        id: 'kyc',
        predictableActionArguments: true,
        initial: 'welcome',

        context: {
          documents: [],
        },

        states: {
          welcome: {
            on: {
              USER_NEXT_STEP: 'document_selection',
            },
          },
          document_selection: {
            on: {
              USER_PREV_STEP: 'welcome',
              USER_NEXT_STEP: 'document_photo',
            },
          },
          document_photo: {
            on: {
              USER_PREV_STEP: 'document_selection',
              USER_NEXT_STEP: 'document_review',
            },
          },
          document_review: {
            on: {
              USER_PREV_STEP: 'document_photo',
              USER_NEXT_STEP: 'selfie',
            },
          },
          selfie: {
            on: {
              USER_PREV_STEP: 'document_review',
              USER_NEXT_STEP: 'selfie_review',
            },
          },
          selfie_review: {
            on: {
              USER_PREV_STEP: 'selfie',
              USER_NEXT_STEP: 'final',
            },
          },
          final: {
            type: 'final',
          },
        },
      },
      persistStates: [
        {
          state: 'document_review',
          persistence: 'BACKEND',
        },
        {
          state: 'document_selection',
          persistence: 'BACKEND',
        },
        {
          state: 'final',
          persistence: 'BACKEND',
        },
      ],
      submitStates: [
        {
          state: 'document_photo',
        },
      ],
      projectId: project1.id,
    },
  });

  const getDocumentsSchema = () =>
    ['id_card', 'passport', 'drivers_license', 'voter_id'].map(name => ({
      category: name,
      type: name,
      issuer: { country: 'ZZ' },
      issuingVersion: 1,
      version: 1,
      propertiesSchema: Type.Object({
        firstName: Type.Optional(Type.String()),
        lastName: Type.Optional(Type.String()),
        documentNumber: Type.Optional(Type.String()),
        dateOfBirth: Type.Optional(Type.String({ format: 'date' })),
        expirationDate: Type.Optional(Type.String({ format: 'date' })),
        isFaceMatching: Type.Optional(Type.Boolean()),
      }),
    }));

  await client.workflowDefinition.create({
    data: {
      ...baseReviewDefinition(generateBaseTaskLevelStates()),
      id: kycWorkflowDefinitionId,
      documentsSchema: getDocumentsSchema(),
      config: {
        workflowLevelResolution: false,
        availableDocuments: [
          {
            category: 'id_card',
            type: 'id_card',
          },
          {
            category: 'passport',
            type: 'passport',
          },
          {
            category: 'drivers_license',
            type: 'drivers_license',
          },
          {
            category: 'voter_id',
            type: 'voter_id',
          },
        ],
      },
      version: 3,
      projectId: project1.id,
    },
  });

  await createFilter(
    'Onboarding - Individuals',
    'individuals',
    {
      select: {
        id: true,
        status: true,
        assigneeId: true,
        context: true,
        createdAt: true,
        state: true,
        tags: true,
        ...baseFilterDefinitionSelect,
        ...baseFilterEndUserSelect,
        ...baseFilterAssigneeSelect,
      },
      where: {
        workflowDefinitionId: { in: [kycManualMachineId] },
        endUserId: { not: null },
      },
    },
    project1.id,
  );

  await createFilter(
    'KYC - Manual Review',
    'individuals',
    {
      select: {
        id: true,
        status: true,
        assigneeId: true,
        context: true,
        createdAt: true,
        state: true,
        tags: true,
        ...baseFilterDefinitionSelect,
        ...baseFilterEndUserSelect,
        ...baseFilterAssigneeSelect,
      },
      where: {
        workflowDefinitionId: { in: [kycWorkflowDefinitionId] },
        endUserId: { not: null },
      },
    },
    project1.id,
  );

  // KYB Risk Score Improvement
  await client.workflowDefinition.create({
    data: {
      id: riskScoreMachineId,
      name: 'kyb_risk_score',
      version: 1,
      definitionType: 'statechart-json',
      config: {
        workflowLevelResolution: false,
        completedWhenTasksResolved: true,
        allowMultipleActiveWorkflows: true,
      },
      definition: {
        id: 'kyb_risk_score',
        predictableActionArguments: true,
        initial: DEFAULT_INITIAL_STATE,
        context: {
          documents: [],
        },
        states: generateBaseTaskLevelStates(),
      },
    },
  });

  await client.$transaction(async () =>
    endUserIds.map(async (id, index) =>
      client.endUser.create({
        /// I tried to fix that so I can run through ajv, currently it doesn't like something in the schema (anyOf  )
        data: generateEndUser({
          id,
          workflow: {
            workflowDefinitionId: kycManualMachineId,
            workflowDefinitionVersion: manualMachineVersion,
            context: await createMockEndUserContextData(id, index + 1),
            state: DEFAULT_INITIAL_STATE,
          },
          projectId: project1.id,
        }),
      }),
    ),
  );

  void client.$disconnect();

  console.info('Seeding database with custom seed...');

  await generateKycSessionDefinition(client);
  await generateKybKycWorkflowDefinition(client);
  await generateKycForE2eTest(client);

  await generateWebsiteMonitoringExample(client, project1.id);

  await generateKycManualReviewRuntimeAndToken(client, {
    workflowDefinitionId: kycWorkflowDefinitionId,
    projectId: project1.id,
    endUserId: endUserIds[0]!,
    token: DEFAULT_TOKENS.KYC,
  });

  console.info('Seeded database successfully');
}
async function createUsers({ project1, project2 }: any, client: PrismaClient) {
  const adminUser = {
    email: 'admin@admin.com',
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    password: await hash('admin', BCRYPT_SALT),
    roles: ['user'],
    avatarUrl: faker.image.people(200, 200, true),
    userToProjects: {
      create: { projectId: project1.id },
    },
  };

  const users = [
    adminUser,
    {
      email: 'agent1@ballerine.com',
      firstName: 'Ezy', //faker.name.firstName(),
      lastName: 'Mukendi', //faker.name.lastName(),
      password: await hash('agent1', BCRYPT_SALT),
      roles: ['user'],
      avatarUrl: faker.image.people(200, 200, true),
      userToProjects: {
        create: { projectId: project1.id },
      },
    },
  ] as const;

  return Promise.all(
    users.map(
      async user =>
        await client.user.upsert({
          where: { email: user.email },
          update: {},
          create: user,
        }),
    ),
  );
}
