import * as graphql from 'graphql'
import { vol } from 'memfs'

import { runPipeline } from '../codegen'
import { Config, fs, path, CollectedGraphQLDocument } from '../lib'
import { ConfigFile } from '../runtime/lib/config'
import { ArtifactKind } from '../runtime/lib/types'

export function testConfigFile(config: Partial<ConfigFile> = {}): ConfigFile {
	return {
		schema: `
			scalar Cursor
			scalar DateTime

			type User implements Node & Friend & CatOwner {
				id: ID!
				name: String!
				birthday: DateTime!
				firstName: String!
				friends: [User!]!
				friendsByCursor(first: Int, after: String, last: Int, before: String, filter: String): UserConnection!
				friendsByCursorScalar(first: Int, after: Cursor, last: Int, before: Cursor, filter: String): UserConnection!
				friendsByBackwardsCursor(last: Int, before: String, filter: String): UserConnectionScalar!
				friendsByForwardsCursor(first: Int, after: String, filter: String): UserConnection!
				friendsByOffset(offset: Int, limit: Int, filter: String): [User!]!
				friendsInterface: [Friend!]!
				believesIn: [Ghost!]!
				believesInConnection(first: Int, after: String, filter: String): GhostConnection!
				cats: [Cat!]!
				field(filter: String): String
			}

			type Ghost implements Friend & CatOwner & IsGhost {
				name: String!
				aka: String!
				believers: [User!]!
				friends: [Ghost!]!
				friendsConnection(first: Int, after: String): GhostConnection!
				legends: [Legend!]!
				cats: [Cat!]!
			}

			type Legend {
				name: String
				believers(first: Int, after: String): GhostConnection
			}

			type Cat implements Friend & Node {
				id: ID!
				name: String!
				owner: User!
			}

			type Query {
				user: User!
				version: Int!
				ghost: Ghost!
				ghosts: GhostConnection!
				friends: [Friend!]!
				users(boolValue: Boolean, intValue: Int, floatValue: Float, stringValue: String!): [User!]!
				entities: [Entity!]!
				usersByCursor(first: Int, after: String, last: Int, before: String): UserConnection!
				usersByBackwardsCursor(last: Int, before: String): UserConnection!
				usersByForwardsCursor(first: Int, after: String): UserConnection!
				usersByOffset(offset: Int, limit: Int): [User!]!
				friendsByCursor(first: Int, after: String, last: Int, before: String): FriendConnection!
				ghostsByCursor(first: Int, after: String, last: Int, before: String): IsGhostConnection!
				entitiesByCursor(first: Int, after: String, last: Int, before: String): EntityConnection!
				node(id: ID!): Node
				customIdList: [CustomIdType]!
			}

			type PageInfo {
				hasPreviousPage: Boolean!
				hasNextPage: Boolean!
				startCursor: String!
				endCursor: String!
			}

			type UserEdge {
				cursor: String!
				node: User
			}

			type UserConnection {
				pageInfo: PageInfo!
				edges: [UserEdge!]!
			}

			type FriendEdge {
				cursor: String!
				node: Friend
			}

			type FriendConnection {
				pageInfo: PageInfo!
				edges: [FriendEdge!]!
			}

			type UserEdgeScalar {
				cursor: Cursor!
				node: User
			}

			type UserConnectionScalar {
				pageInfo: PageInfo!
				edges: [UserEdgeScalar!]!
			}

			type GhostEdge {
				cursor: String!
				node: Ghost
			}

			type GhostConnection {
				pageInfo: PageInfo!
				edges: [GhostEdge!]!
			}

			type EntityEdge {
				cursor: String!
				node: Entity
			}

			type EntityConnection {
				pageInfo: PageInfo!
				edges: [EntityEdge!]!
			}

			type IsGhostEdge {
				cursor: String!
				node: IsGhost
			}

			type IsGhostConnection {
				pageInfo: PageInfo!
				edges: [IsGhostEdge!]!
			}

			interface Friend {
				name: String!
			}

			interface CatOwner {
				cats: [Cat!]!
			}

			interface IsGhost { 
				aka: String!
			}

			union Entity = User | Cat | Ghost

			type Mutation {
				updateUser: User!
				addFriend: AddFriendOutput!
				believeIn: BelieveInOutput!
				deleteUser(id: ID!): DeleteUserOutput!
				catMutation: CatMutationOutput!
				deleteCat: DeleteCatOutput!
			}

			type Subscription {
				newUser: NewUserResult!
			}

			type NewUserResult {
				user: User!
			}

			type AddFriendOutput {
				friend: User!
			}

			type BelieveInOutput {
				ghost: Ghost
			}

			type DeleteUserOutput {
				userID: ID!
			}

			type DeleteCatOutput {
				catID: ID
			}

			type CatMutationOutput {
				cat: Cat
			}

			interface  Node {
				id: ID!
			}

			enum TestEnum1 {
				Value1
				Value2
			}

			enum TestEnum2 {
				Value3
				Value2
			}

			type CustomIdType {
				foo: String!
				bar: String!
				dummy: String
			}
		`,

		scalars: {
			DateTime: {
				type: 'Date',
				unmarshal(val: number): Date {
					if (typeof val !== 'number') {
						throw new Error('unmarshaling not a number')
					}
					return new Date(val)
				},
				marshal(date: Date): number {
					return date.getTime()
				},
			},
		},
		framework: 'kit',
		types: {
			Ghost: {
				keys: ['name', 'aka'],
				resolve: {
					queryField: 'ghost',
				},
			},
			CustomIdType: {
				keys: ['foo', 'bar'],
			},
		},
		logLevel: 'quiet',
		plugins: {
			'houdini-svelte': {
				client: './my/client/path',
			},
		},
		acceptImperativeInstability: true,
		...config,
	}
}

export function testConfig(config: Partial<ConfigFile> = {}) {
	return new Config({
		filepath: path.join(process.cwd(), 'config.cjs'),
		...testConfigFile(config),
	})
}

export type Partial<T> = {
	[P in keyof T]?: T[P]
}

export function pipelineTest(
	config: Config,
	documents: string[],
	shouldPass: boolean,
	testBody?: ((result: Error | Error[]) => void) | ((docs: CollectedGraphQLDocument[]) => void)
) {
	return async () => {
		// the first thing to do is to create the list of collected documents
		const docs: CollectedGraphQLDocument[] = documents.map(mockCollectedDoc)

		// we need to trap if we didn't fail
		let error: Error[] = []

		try {
			// apply the transforms
			await runPipeline(config, docs)
		} catch (e) {
			// only bubble the error up if we're supposed to pass the test
			if (shouldPass) {
				// console.error(docs)
				console.error(e)
				throw 'pipeline failed when it should have passed'
			}
			error = e as Error[]
		}

		// if we shouldn't pass but we did, we failed the test
		if (!shouldPass && error.length === 0) {
			throw "pipeline shouldn't have passed!"
		}

		// run the rest of the test
		if (testBody) {
			// @ts-ignore
			// invoke the test body with the error instead of the documents
			testBody(shouldPass ? docs : error)
		}
	}
}

export function mockCollectedDoc(query: string): CollectedGraphQLDocument {
	const parsed = graphql.parse(query)

	// look at the first definition in the pile for the name
	// @ts-ignore
	const name = parsed.definitions[0].name.value

	const operations = parsed.definitions

	// figure out the document kind
	let kind = ArtifactKind.Fragment
	if (operations.length === 1) {
		// the document kind depends on the artifact
		// query
		if (operations[0].kind === 'OperationDefinition' && operations[0].operation === 'query') {
			kind = ArtifactKind.Query
		}
		// mutation
		else if (
			operations[0].kind === 'OperationDefinition' &&
			operations[0].operation === 'mutation'
		) {
			kind = ArtifactKind.Mutation
		}
		// subscription
		else if (
			operations[0].kind === 'OperationDefinition' &&
			operations[0].operation === 'subscription'
		) {
			kind = ArtifactKind.Subscription
		}
	}

	return {
		name,
		kind,
		document: parsed,
		originalDocument: parsed,
		filename: `${name}.ts`,
		generateArtifact: true,
		generateStore: true,
		originalString: query,
	}
}

export function clearMock() {
	vol.reset()

	const config = testConfig()

	fs.mkdirpSync(path.join(process.cwd(), 'src', 'routes'))
	fs.mkdirpSync(path.join(process.cwd(), 'src', 'lib'))
	config.createDirectories()
}
