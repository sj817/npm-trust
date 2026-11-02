//! Model serialization + `sameBinding`, porting the Rust `model.rs` unit tests.

import { describe, expect, it } from 'vitest'

import {
  githubTrust,
  gitlabTrust,
  Permission,
  permissionLabel,
  sameBinding,
  sameClaims,
} from '../src/registry/index'

// Not a deep-clone: JSON round-trip deliberately drops `undefined` members so
// assertions see exactly what would go on the wire.
// eslint-disable-next-line unicorn/prefer-structured-clone
const wire = (v: unknown): unknown => JSON.parse(JSON.stringify(v))

describe('model', () => {
  it('github serializes to the documented shape (no id, no environment)', () => {
    const cfg = githubTrust('npm/cli', 'publish.yml', undefined, [Permission.Publish])
    expect(wire(cfg)).toEqual({
      type: 'github',
      claims: { repository: 'npm/cli', workflow_ref: { file: 'publish.yml' } },
      permissions: ['createPackage'],
    })
  })

  it('includes environment only when provided', () => {
    const cfg = githubTrust('npm/cli', 'publish.yml', 'release', [Permission.Publish])
    expect((wire(cfg) as { claims: { environment?: string } }).claims.environment).toBe('release')
  })

  it('gitlab serializes with ci_config_ref_uri', () => {
    const cfg = gitlabTrust('group/proj', '.gitlab-ci.yml', undefined, [
      Permission.Publish,
      Permission.StagePublish,
    ])
    expect(wire(cfg)).toEqual({
      type: 'gitlab',
      claims: { project_path: 'group/proj', ci_config_ref_uri: { file: '.gitlab-ci.yml' } },
      permissions: ['createPackage', 'createStagedPackage'],
    })
  })

  it('permissionLabel maps wire values to human labels', () => {
    expect(permissionLabel(Permission.Publish)).toBe('publish')
    expect(permissionLabel(Permission.StagePublish)).toBe('stage publish')
    expect(permissionLabel(Permission.ManageDistTags)).toBe('manage dist-tags')
  })

  it('sameBinding is order-insensitive on permissions and ignores id', () => {
    const a = githubTrust('o/r', 'publish.yml', undefined, [
      Permission.Publish,
      Permission.StagePublish,
    ])
    const b = githubTrust('o/r', 'publish.yml', undefined, [
      Permission.StagePublish,
      Permission.Publish,
    ])
    b.id = 'server-assigned'
    expect(sameBinding(a, b)).toBe(true)

    const c = githubTrust('other/repo', 'publish.yml', undefined, [Permission.Publish])
    expect(sameBinding(a, c)).toBe(false)
    expect(sameClaims(a, b)).toBe(true)
    expect(sameClaims(a, c)).toBe(false)
  })

  it('keeps dist-tag management distinct from publish-only', () => {
    const publishOnly = githubTrust('o/r', 'publish.yml', 'npm', [Permission.Publish])
    const publishAndTag = githubTrust('o/r', 'publish.yml', 'npm', [
      Permission.Publish,
      Permission.ManageDistTags,
    ])
    expect(sameClaims(publishOnly, publishAndTag)).toBe(true)
    expect(sameBinding(publishOnly, publishAndTag)).toBe(false)
  })
})
