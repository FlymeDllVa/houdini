import { fs, path } from 'houdini'
import * as recast from 'recast'
import * as typeScriptParser from 'recast/parsers/typescript'
import { expect, test } from 'vitest'

import { pipeline_test } from '../../../test'
import { global_stores_directory } from '../../kit'

test('change prefix to "yop___"', async function () {
	const docs = [`query TestQuery { version }`]

	const { plugin_root } = await pipeline_test(docs, {
		plugins: {
			'houdini-svelte': {},
			'houdini-plugin-svelte-global-stores': {
				prefix: 'yop___',
			},
		},
	})

	const contents = await fs.readFile(
		path.join(global_stores_directory(plugin_root), 'TestQuery.js')
	)

	// parse the contents
	const parsed = recast.parse(contents!, {
		parser: typeScriptParser,
	}).program

	// check the file contents
	expect(parsed).toMatchInlineSnapshot(`
		import { TestQueryStore } from '../../houdini-svelte/stores'

		export const yop___TestQuery = new TestQueryStore()
	`)
})

test('change prefix to ""', async function () {
	const docs = [`query TestQuery { version }`]

	const { plugin_root } = await pipeline_test(docs, {
		plugins: {
			'houdini-svelte': {},
			'houdini-plugin-svelte-global-stores': {
				prefix: '',
			},
		},
	})

	const contents = await fs.readFile(
		path.join(global_stores_directory(plugin_root), 'TestQuery.js')
	)

	// parse the contents
	const parsed = recast.parse(contents!, {
		parser: typeScriptParser,
	}).program

	// check the file contents
	expect(parsed).toMatchInlineSnapshot(`
		import { TestQueryStore } from '../../houdini-svelte/stores'

		export const TestQuery = new TestQueryStore()
	`)
})
