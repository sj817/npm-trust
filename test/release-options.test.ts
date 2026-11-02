import { describe, expect, it } from 'vitest'

import { desiredBinding } from '../src/engine'
import { publishPlaceholder } from '../src/wizard'
import { Permission } from '../src/registry/index'

describe('release options', () => {
  const pkg = { name: '@example/native', private: false, repository: 'example/native' }

  it('includes dist-tag management only when requested', () => {
    expect(desiredBinding(pkg)?.config.permissions).toEqual([Permission.Publish])
    expect(desiredBinding(pkg, 'publish.yml', 'npm', true)?.config).toMatchObject({
      claims: { environment: 'npm', repository: 'example/native' },
      permissions: [Permission.Publish, Permission.ManageDistTags],
    })
  })

  it('refuses to publish placeholders under a release tag', () => {
    for (const tag of ['latest', 'next', 'beta', 'bootstrap/unsafe']) {
      expect(() => publishPlaceholder('@example/native', undefined, tag)).toThrow(
        'placeholder tag must be bootstrap',
      )
    }
  })
})
