import { Customer, PrismaClient, Project, Prisma, EndUser } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { hashKey } from './../src/customer/api-key/utils';
import { env } from '../src/env';
import { hash } from 'bcrypt';
import { CommonWorkflowStates, StateTag } from '@ballerine/common';
import { generateEndUser } from './generate-end-user';
import { generateKycSessionDefinition } from './workflows/kyc-email-process-example';
import { generateBaseTaskLevelStates } from './workflows/generate-base-task-level-states';

import {
  baseFilterAssigneeSelect,
  baseFilterBusinessSelect,
  baseFilterDefinitionSelect,
  baseFilterEndUserSelect,
} from './filters';
import { InputJsonValue } from '../src/types';
import { Type } from '@sinclair/typebox';
import { generateKycManualReviewRuntimeAndToken } from './workflows/runtime/geneate-kyc-manual-review-runtime-and-token';

const BCRYPT_SALT: string | number = 10;
const DEFAULT_INITIAL_STATE = CommonWorkflowStates.MANUAL_REVIEW;
const DEFAULT_TOKENS = {
  KYB: '12345678-1234-1234-1234-123456789012',
  KYC: '12345678-1234-1234-1234-123456789000',
};
customSeed().catch(error => {
  console.error(error);
  process.exit(1);
});

export async function customSeed() {
  console.log('Basa-Seeding database');
  const client = new PrismaClient();
  const email = 'admin@admin.com';

  await generateKycSessionDefinition(client);

  const kycWorkflowDefinitionId = 'kyc-manual-review';
  const kycManualMachineId = 'MANUAL_REVIEW_0002zpeid7bq9aaa';

  //replace this sample code to populate your database
  //with data that is required for your service to start
  // await client.user.update({
  //   where: { email: email },
  //   data: {
  //     email,
  //   },
  // });

  const customer = (await createCustomer(
    client,
    '1',
    env.API_KEY,
    'https://blrn-cdn-prod.s3.eu-central-1.amazonaws.com/images/ballerine_logo.svg',
    '',
    `webhook-shared-secret-${env.API_KEY}`,
  )) as Customer;

  const project1 = (await createProject(client, customer, '1')) as Project;
  const admin = (await createUsers({ project1, project2: null }, client))[0];
  createFilters();
  kycWorkflow();
  endUser();

  client.$disconnect();
  console.log('Basa-Database seeded');
}

export async function createFilters() {
  console.log('Basa-Creating kyc workflow FILTERS');
  const client = new PrismaClient();

  const kycWorkflowDefinitionId = 'kyc-manual-review';
  const kycManualMachineId = 'MANUAL_REVIEW_0002zpeid7bq9aaa';
  const riskScoreMachineKybId = 'risk-score-improvement-dev';

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
    'project-1',
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
    'project-1',
  );

  // await createFilter(
  //   'Risk Score Improvement - Individuals',
  //   'individuals',
  //   {
  //     select: {
  //       id: true,
  //       status: true,
  //       assigneeId: true,
  //       createdAt: true,
  //       context: true,
  //       state: true,
  //       tags: true,
  //       ...baseFilterDefinitionSelect,
  //       ...baseFilterEndUserSelect,
  //       ...baseFilterAssigneeSelect,
  //     },
  //     where: {
  //       workflowDefinitionId: { in: [kycWorkflowDefinitionId] },
  //       endUserId: { not: null },
  //     },
  //   },
  //   'project-1',
  // );

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
}

export async function kycWorkflow() {
  console.log('Basa-Creating kyc workflow');
  const client = new PrismaClient();

  const kycWorkflowDefinitionId = 'kyc-manual-review';
  const kycManualMachineId = 'MANUAL_REVIEW_0002zpeid7bq9aaa';
  const onboardingMachineKycId = 'COLLECT_DOCS_b0002zpeid7bq9aaa';
  const manualMachineVersion = 1;

  await client.workflowDefinition.create({
    data: {
      id: kycWorkflowDefinitionId, // should be auto generated normally
      reviewMachineId: kycManualMachineId,
      name: 'kyc',
      version: 1,
      definitionType: 'statechart-json',
      definition: {
        id: kycWorkflowDefinitionId,
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
      projectId: 'project-1',
    },
  });

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
      projectId: 'project-1',
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
      id: kycWorkflowDefinitionId + '-v3',
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
      projectId: 'project-1',
    },
  });
}
export async function endUser() {
  console.log('Basa-Creating end user');
  const kycWorkflowDefinitionId = 'kyc-manual-review';
  const onboardingMachineKycId = 'COLLECT_DOCS_b0002zpeid7bq9aaa';

  const kycManualMachineId = 'MANUAL_REVIEW_0002zpeid7bq9aaa';
  const client = new PrismaClient();
  const fields = {
    data: {
      id: '123e4567-e89b-12d3-a456-426655440000-user',
      correlationId: '1',
      firstName: 'Remo',
      lastName: 'Basa',
      approvalState: 'PROCESSING',
      email: 'remo@gmail.com',
      phone: '+243992457388',
      dateOfBirth: '1990-01-01T00:00:00.000Z',
      avatarUrl: 'https://example.com/avatar.jpg',
      project: {
        connect: {
          id: 'project-1',
        },
      },
      workflowRuntimeData: {
        create: {
          state: 'welcome',
          context: {
            entity: {
              type: 'individual',
              data: {
                firstName: 'Remo',
                lastName: 'Basa',
                email: 'remo@gmail.com',
                approvalState: 'NEW',
                phone: '+243992457388',
                stateReason: 'Poor quality of documents',
                dateOfBirth: '2000-01-01T00:00:00.000Z',
                additionalInfo: {
                  customParam: 'customValue',
                },
              },
              ballerineEntityId: '123e4567-e89b-12d3-a456-426655440000',
              id: '123e4567-e89b-12d3-a456-426655440000-user',
            },
            documents: [
              {
                id: 'document1',
                category: 'id',
                type: 'photo',
                issuer: {
                  type: 'government',
                  name: 'Government',
                  country: 'CA',
                  city: 'Toronto',
                  additionalInfo: {
                    customParam: 'customValue',
                  },
                },
                issuingVersion: 1,
                version: 1,
                pages: [
                  // {
                  //   provider: "http",
                  //   uri: "http://example.com/set_1_doc_front.png",
                  //   type: "jpg",
                  //   data: "",
                  //   ballerineFileId: "file1",
                  //   metadata: {
                  //     side: "front",
                  //     pageNumber: "1"
                  //   }
                  // },
                  // {
                  //   provider: "http",
                  //   uri: "http://example.com/set_1_doc_face.png",
                  //   type: "jpg",
                  //   data: "",
                  //   ballerineFileId: "file2",
                  //   metadata: {
                  //     side: "back",
                  //     pageNumber: "1"
                  //   }
                  // }
                ],
                properties: {
                  firstName: 'Remo',
                  middleName: 'Michael',
                  lastName: 'Basa',
                  authority: 'Government Agency',
                  placeOfIssue: 'New York',
                  issueDate: '2010-01-01',
                  expires: '2030-01-01',
                  dateOfBirth: '1990-01-01',
                  placeOfBirth: 'Los Angeles',
                  sex: 'male',
                },
              },
              {
                id: 'document2',
                category: 'selfie',
                type: 'photo',
                issuer: {
                  type: 'government',
                  name: 'Government',
                  country: 'CA',
                  city: 'Toronto',
                  additionalInfo: {
                    customParam: 'customValue',
                  },
                },
                issuingVersion: 1,
                version: 1,
                pages: [
                  // {
                  //   provider: "http",
                  //   uri: "http://example.com/set_1_selfie.png",
                  //   type: "image/png",
                  //   data: "",
                  //   ballerineFileId: "file3",
                  //   metadata: {}
                  // }
                ],
                properties: {
                  firstName: 'Remo',
                  middleName: 'Michael',
                  lastName: 'Basa',
                  authority: 'Government Agency',
                  placeOfIssue: 'New York',
                  issueDate: '2010-01-01',
                  expires: '2030-01-01',
                  dateOfBirth: '1990-01-01',
                  placeOfBirth: 'Los Angeles',
                  sex: 'male',
                },
              },
            ],
            metadata: {
              collectionFlowUrl: env.COLLECTION_FLOW_URL,
              webUiSDKUrl: env.WEB_UI_SDK_URL,
              token: DEFAULT_TOKENS.KYC,
            },
          },
          projectId: 'project-1',
          workflowDefinitionId: kycWorkflowDefinitionId,
          workflowDefinitionVersion: 1,
          createdAt: '2023-06-08T00:00:00.000Z',
          parentRuntimeDataId: null,
          tags: ['MANUAL_REVIEW'],
        },
      },
    },
  };
  const user = await client.endUser.create(fields as any);

  const creationArgs = {
    data: {
      endUserId: '123e4567-e89b-12d3-a456-426655440000-user',
      projectId: 'project-1',
      workflowDefinitionId: kycWorkflowDefinitionId + '-v3',
      state: 'manual_review',
      context: {
        workflowId: kycWorkflowDefinitionId + '-v3',
        entity: {
          ballerineEntityId: '123e4567-e89b-12d3-a456-426655440000-user',
          type: 'individuals',
          data: {
            firstName: 'Remo',
            lastName: 'Basa',
            email: 'remo@gmail.com',
            phone: '+243992457388',
            stateReason: 'Poor quality of documents',
            dateOfBirth: '2000-01-01T00:00:00.000Z',
          },
        },
        documents: [],
        metadata: {
          collectionFlowUrl: env.COLLECTION_FLOW_URL,
          webUiSDKUrl: env.WEB_UI_SDK_URL,
          token: DEFAULT_TOKENS.KYC,
        },
      },
      businessId: null,
      workflowDefinitionVersion: 1,
    },
  };

  const workflowRuntime = await client.workflowRuntimeData.create(creationArgs as any);

  return client.workflowRuntimeDataToken.create({
    data: {
      token: DEFAULT_TOKENS.KYC,
      projectId: 'project-1',
      endUserId: '123e4567-e89b-12d3-a456-426655440000-user',
      workflowRuntimeDataId: workflowRuntime.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

async function createUsers({ project1, project2 }: any, client: PrismaClient) {
  console.log('Basa-Creating users');
  const adminUser = {
    email: 'admin@admin.com',
    firstName: 'Ntambwa', //faker.name.firstName(),
    lastName: 'Basa', //faker.name.lastName(),
    password: await hash('admin', BCRYPT_SALT),
    roles: ['admin'],
    avatarUrl: faker.image.people(200, 200, true),
    userToProjects: {
      create: { projectId: project1.id },
    },
  };

  const users = [adminUser] as const;

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

async function createProject(client: PrismaClient, customer: Customer, id: string) {
  console.log('Basa-Creating project');
  return client.project.create({
    data: {
      id: `project-${id}`,
      name: `Project ${id}`,
      customerId: customer.id,
    },
  });
}

async function createCustomer(
  client: PrismaClient,
  id: string,
  apiKey: string,
  logoImageUri: string,
  faviconImageUri: string,
  webhookSharedSecret: string,
) {
  console.log('Basa-Creating customer');
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

async function createMockEndUserContextData(endUserId: string, countOfIndividual: number) {
  const correlationId = faker.datatype.uuid();
  // const imageUri1 = generateAvatarImageUri(
  //   `set_${countOfIndividual}_doc_front.png`,
  //   countOfIndividual,
  // );
  // const imageUri2 = generateAvatarImageUri(
  //   `set_${countOfIndividual}_doc_face.png`,
  //   countOfIndividual,
  // );
  // const imageUri3 = generateAvatarImageUri(
  //   `set_${countOfIndividual}_selfie.png`,
  //   countOfIndividual,
  //   true,
  // );

  return {
    entity: {
      type: 'individual',
      data: {
        id: '43a0a298-0d02-4a2e-a8cc-73c06b465310',
        firstName: 'Nadia',
        lastName: 'Comaneci',
        email: 'nadia@ballerine.com',
        correlationId: '1',
        // dateOfBirth: '2000-11-04T12:45:51.695Z',
        projectId: 'project-1',
        approvalState: 'NEW',
        phone: faker.phone.number(),
        stateReason: 'Poor quality of documents',
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
            // uri: imageUri1,
            type: 'jpg',
            data: '',
            // ballerineFileId: await persistImageFile(client, imageUri1, project1.id),
            metadata: {
              side: 'front',
              pageNumber: '1',
            },
          },
          {
            provider: 'http',
            // uri: imageUri2,
            type: 'jpg',
            data: '',
            // ballerineFileId: await persistImageFile(client, imageUri2, project1.id),
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
            // uri: imageUri3,
            type: 'image/png',
            data: '',
            // ballerineFileId: await persistImageFile(client, imageUri3, 'project-1'),
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
