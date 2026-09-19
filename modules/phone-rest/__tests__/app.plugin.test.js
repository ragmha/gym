/* global __dirname */
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const { afterEach, beforeEach, describe, expect, it } = require('@jest/globals')
const { IOSConfig, compileModsAsync } = require('expo/config-plugins')
const withPhoneRestReport = require('../app.plugin')
const {
  TARGET_NAME,
  SOURCE_FILES,
  getReportOptions,
  withReportConfig,
  writeReportFiles,
  ensureReportTarget,
} = withPhoneRestReport

const requireExpo = createRequire(require.resolve('expo/config-plugins'))
const requirePlugins = createRequire(
  requireExpo.resolve('@expo/config-plugins'),
)
const requireXcode = createRequire(requirePlugins.resolve('xcode'))
const xcode = requireXcode('./')
const parser = requireXcode('./lib/parser/pbxproj')
const plist = requirePlugins('@expo/plist').default
const { getBuildConfigurationsForListId, unquote } = IOSConfig.XcodeUtils
const FAMILY_CONTROLS = 'com.apple.developer.family-controls'
const HOST_ID = 'B00000000000000000000001'
const SWIFTUI_ID = 'C00000000000000000000001'

// A standalone CNG-shaped project: tests also work before ios/ has been generated.
const BASE_PROJECT = `// !$*UTF8*$!
{
  archiveVersion = 1;
  classes = {};
  objectVersion = 54;
  objects = {
/* Begin PBXProject section */
    A00000000000000000000001 /* Project object */ = {
      isa = PBXProject;
      attributes = { LastUpgradeCheck = 1600; };
      buildConfigurationList = A00000000000000000000006;
      compatibilityVersion = "Xcode 14.0";
      developmentRegion = en;
      hasScannedForEncodings = 0;
      knownRegions = (en, Base,);
      mainGroup = A00000000000000000000002;
      productRefGroup = A00000000000000000000003;
      projectDirPath = "";
      projectRoot = "";
      targets = (B00000000000000000000001 /* gym */,);
    };
/* End PBXProject section */
/* Begin PBXGroup section */
    A00000000000000000000002 = { isa = PBXGroup; children = (
      A00000000000000000000005 /* gym */,
      A00000000000000000000003 /* Products */,
      A00000000000000000000004 /* Frameworks */,
    ); sourceTree = "<group>"; };
    A00000000000000000000003 /* Products */ = {
      isa = PBXGroup; children = (B00000000000000000000008 /* gym.app */,);
      name = Products; sourceTree = "<group>";
    };
    A00000000000000000000004 /* Frameworks */ = {
      isa = PBXGroup; children = (C00000000000000000000001 /* SwiftUI.framework */,);
      name = Frameworks; sourceTree = "<group>";
    };
    A00000000000000000000005 /* gym */ = {
      isa = PBXGroup; children = (
        B00000000000000000000009 /* AppDelegate.swift */,
        B0000000000000000000000A /* Info.plist */,
      ); path = gym; sourceTree = "<group>";
    };
/* End PBXGroup section */
/* Begin PBXNativeTarget section */
    B00000000000000000000001 /* gym */ = {
      isa = PBXNativeTarget;
      buildConfigurationList = B00000000000000000000002;
      buildPhases = (
        B00000000000000000000005 /* Sources */,
        B00000000000000000000006 /* Frameworks */,
        B00000000000000000000007 /* Resources */,
      );
      buildRules = (); dependencies = (); name = gym; productName = gym;
      productReference = B00000000000000000000008 /* gym.app */;
      productType = "com.apple.product-type.application";
    };
/* End PBXNativeTarget section */
/* Begin PBXSourcesBuildPhase section */
    B00000000000000000000005 /* Sources */ = {
      isa = PBXSourcesBuildPhase; buildActionMask = 2147483647;
      files = (C00000000000000000000002 /* AppDelegate.swift in Sources */,);
      runOnlyForDeploymentPostprocessing = 0;
    };
/* End PBXSourcesBuildPhase section */
/* Begin PBXFrameworksBuildPhase section */
    B00000000000000000000006 /* Frameworks */ = {
      isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647;
      files = (C00000000000000000000003 /* SwiftUI.framework in Frameworks */,);
      runOnlyForDeploymentPostprocessing = 0;
    };
/* End PBXFrameworksBuildPhase section */
/* Begin PBXResourcesBuildPhase section */
    B00000000000000000000007 /* Resources */ = {
      isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = ();
      runOnlyForDeploymentPostprocessing = 0;
    };
/* End PBXResourcesBuildPhase section */
/* Begin PBXFileReference section */
    B00000000000000000000008 /* gym.app */ = { isa = PBXFileReference;
      explicitFileType = wrapper.application; path = gym.app; sourceTree = BUILT_PRODUCTS_DIR; };
    B00000000000000000000009 /* AppDelegate.swift */ = { isa = PBXFileReference;
      lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };
    B0000000000000000000000A /* Info.plist */ = { isa = PBXFileReference;
      lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
    C00000000000000000000001 /* SwiftUI.framework */ = { isa = PBXFileReference;
      lastKnownFileType = wrapper.framework; path = System/Library/Frameworks/SwiftUI.framework;
      sourceTree = SDKROOT; };
/* End PBXFileReference section */
/* Begin PBXBuildFile section */
    C00000000000000000000002 /* AppDelegate.swift in Sources */ = {
      isa = PBXBuildFile; fileRef = B00000000000000000000009 /* AppDelegate.swift */; };
    C00000000000000000000003 /* SwiftUI.framework in Frameworks */ = {
      isa = PBXBuildFile; fileRef = C00000000000000000000001 /* SwiftUI.framework */; };
/* End PBXBuildFile section */
/* Begin XCConfigurationList section */
    A00000000000000000000006 = { isa = XCConfigurationList; buildConfigurations = (
      A00000000000000000000007 /* Debug */, A00000000000000000000008 /* Release */,
    ); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release; };
    B00000000000000000000002 = { isa = XCConfigurationList; buildConfigurations = (
      B00000000000000000000003 /* Debug */, B00000000000000000000004 /* Release */,
    ); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release; };
/* End XCConfigurationList section */
/* Begin XCBuildConfiguration section */
    A00000000000000000000007 /* Debug */ = { isa = XCBuildConfiguration; name = Debug;
      buildSettings = { CLANG_ENABLE_MODULES = YES; IPHONEOS_DEPLOYMENT_TARGET = 15.1; }; };
    A00000000000000000000008 /* Release */ = { isa = XCBuildConfiguration; name = Release;
      buildSettings = { CLANG_ENABLE_MODULES = YES; IPHONEOS_DEPLOYMENT_TARGET = 15.1; }; };
    B00000000000000000000003 /* Debug */ = { isa = XCBuildConfiguration; name = Debug;
      buildSettings = {
        PRODUCT_BUNDLE_IDENTIFIER = com.example.gym; DEVELOPMENT_TEAM = DEBUGTEAM1;
        CODE_SIGN_ENTITLEMENTS = gym/gym.entitlements; INFOPLIST_FILE = gym/Info.plist;
        TARGETED_DEVICE_FAMILY = "1,2"; IPHONEOS_DEPLOYMENT_TARGET = 15.1;
      }; };
    B00000000000000000000004 /* Release */ = { isa = XCBuildConfiguration; name = Release;
      buildSettings = {
        PRODUCT_BUNDLE_IDENTIFIER = com.example.gym; DEVELOPMENT_TEAM = RELEASETM1;
        CODE_SIGN_ENTITLEMENTS = gym/gym.entitlements; INFOPLIST_FILE = gym/Info.plist;
        TARGETED_DEVICE_FAMILY = "1,2"; IPHONEOS_DEPLOYMENT_TARGET = 15.1;
      }; };
/* End XCBuildConfiguration section */
  };
  rootObject = A00000000000000000000001 /* Project object */;
}
`

const fixtures = new Set()
const originalBuildProfile = process.env.EAS_BUILD_PROFILE

beforeEach(() => {
  delete process.env.EAS_BUILD_PROFILE
})

afterEach(() => {
  if (originalBuildProfile === undefined) delete process.env.EAS_BUILD_PROFILE
  else process.env.EAS_BUILD_PROFILE = originalBuildProfile
  for (const directory of fixtures)
    fs.rmSync(directory, { recursive: true, force: true })
  fixtures.clear()
})

function makeConfig(overrides = {}) {
  return {
    name: 'gym',
    slug: 'gym',
    version: '2.3.4',
    ...overrides,
    ios: {
      bundleIdentifier: 'com.example.gym',
      buildNumber: '27',
      supportsTablet: true,
      ...overrides.ios,
    },
  }
}

function parseProject(contents = BASE_PROJECT) {
  const project = xcode.project('in-memory.pbxproj')
  project.hash = parser.parse(contents)
  return project
}

function nativeTarget(project, name = TARGET_NAME) {
  return IOSConfig.Target.findNativeTargetByName(project, name)
}

function configurations(project, target = nativeTarget(project)[1]) {
  return getBuildConfigurationsForListId(
    project,
    target.buildConfigurationList,
  ).map(([, configuration]) => configuration)
}

function phases(project, target, type) {
  return target.buildPhases
    .map(({ value }) => project.hash.project.objects[type]?.[value])
    .filter(Boolean)
}

function buildReferences(project, phase) {
  return phase.files.map(
    ({ value }) => project.pbxBuildFileSection()[value].fileRef,
  )
}

function dependencyTargets(project, target) {
  return target.dependencies.map(
    ({ value }) =>
      project.hash.project.objects.PBXTargetDependency[value].target,
  )
}

function apply(project, config = makeConfig(), projectName) {
  return ensureReportTarget(project, getReportOptions(config), projectName)
}

function addOtherTarget(project, name, type = 'application') {
  project.hash.project.objects.PBXTargetDependency ??= {}
  project.hash.project.objects.PBXContainerItemProxy ??= {}
  return project.addTarget(name, type, name, `com.example.${name}`)
}

function makeFixture() {
  const directory = fs.mkdtempSync(path.join(__dirname, '.phone-rest-fixture-'))
  fixtures.add(directory)
  for (const source of SOURCE_FILES) {
    const sourcePath = path.join(directory, 'modules', 'phone-rest', source)
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, `// Canonical fixture: ${source}\n`)
  }
  const ios = path.join(directory, 'ios')
  fs.mkdirSync(path.join(ios, 'gym.xcodeproj'), { recursive: true })
  fs.mkdirSync(path.join(ios, 'gym'), { recursive: true })
  fs.writeFileSync(
    path.join(ios, 'gym', 'AppDelegate.swift'),
    '// Host AppDelegate fixture\n',
  )
  fs.writeFileSync(
    path.join(ios, 'gym.xcodeproj', 'project.pbxproj'),
    BASE_PROJECT,
  )
  fs.writeFileSync(
    path.join(ios, 'gym', 'Info.plist'),
    plist.build({ CFBundleIdentifier: 'com.example.gym', CFBundleName: 'gym' }),
  )
  fs.writeFileSync(
    path.join(ios, 'gym', 'gym.entitlements'),
    plist.build({
      'com.apple.developer.healthkit': true,
      'get-task-allow': true,
    }),
  )
  return { directory, ios }
}

describe('PhoneRestReport config', () => {
  it('initializes distribution approval to false and preserves only explicit true without losing other extras', () => {
    expect(withReportConfig(makeConfig()).extra.phoneRest).toEqual({
      distributionApproved: false,
    })
    for (const approval of [undefined, false, null, 'true', 1, true]) {
      const config = makeConfig({
        extra: {
          phoneRest: { distributionApproved: approval, keep: 'phone-rest' },
          eas: { projectId: 'preserved-project-id' },
        },
      })
      const original = JSON.stringify(config)
      const updated = withReportConfig(config)
      expect(updated.extra.phoneRest).toEqual({
        distributionApproved: approval === true,
        keep: 'phone-rest',
      })
      expect(updated.extra.eas.projectId).toBe('preserved-project-id')
      expect(withReportConfig(updated)).toEqual(updated)
      expect(JSON.stringify(config)).toBe(original)
    }
  })

  it('merges host entitlements and EAS credentials without losing other config or duplicating its target', () => {
    const widget = {
      targetName: 'Widget',
      bundleIdentifier: 'com.example.Widget',
      entitlements: { 'aps-environment': 'development' },
    }
    const config = makeConfig({
      plugins: ['expo-router', ['./another-plugin', { keep: true }]],
      ios: {
        entitlements: {
          'com.apple.developer.healthkit': true,
          [FAMILY_CONTROLS]: false,
        },
      },
      extra: {
        keep: 'extra',
        eas: {
          projectId: 'project-id',
          build: {
            keep: 'build',
            experimental: {
              android: { keep: true },
              ios: {
                keep: 'ios',
                appExtensions: [
                  widget,
                  {
                    targetName: TARGET_NAME,
                    bundleIdentifier: 'old.id',
                    keep: 'report',
                    entitlements: {
                      'get-task-allow': true,
                      [FAMILY_CONTROLS]: false,
                    },
                  },
                  {
                    targetName: TARGET_NAME,
                    entitlements: { 'aps-environment': 'development' },
                  },
                ],
              },
            },
          },
        },
      },
    })
    const original = JSON.stringify(config)
    const updated = withReportConfig(config)
    expect(withReportConfig(updated)).toEqual(updated)
    expect(JSON.stringify(config)).toBe(original)
    expect(updated.plugins).toBe(config.plugins)
    expect(updated.ios.entitlements).toEqual({
      'com.apple.developer.healthkit': true,
      [FAMILY_CONTROLS]: true,
    })
    expect(updated.extra).toMatchObject({
      keep: 'extra',
      eas: {
        projectId: 'project-id',
        build: {
          keep: 'build',
          experimental: { android: { keep: true }, ios: { keep: 'ios' } },
        },
      },
    })
    expect(updated.extra.eas.build.experimental.ios.appExtensions).toEqual([
      widget,
      {
        targetName: TARGET_NAME,
        bundleIdentifier: 'com.example.gym.PhoneRestReport',
        keep: 'report',
        entitlements: {
          'get-task-allow': true,
          'aps-environment': 'development',
          [FAMILY_CONTROLS]: true,
        },
      },
    ])
  })

  it('uses Expo defaults and device families, and requires a bundle identifier and valid EAS list', () => {
    const options = getReportOptions({
      ios: { bundleIdentifier: 'com.example.app' },
    })
    expect(options).toMatchObject({
      bundleIdentifier: 'com.example.app.PhoneRestReport',
      version: '1.0.0',
      buildNumber: '1',
      deviceFamilies: [1],
      entitlements: { [FAMILY_CONTROLS]: true },
    })
    expect(
      getReportOptions(makeConfig({ ios: { isTabletOnly: true } }))
        .deviceFamilies,
    ).toEqual([2])
    expect(() => withPhoneRestReport({})).toThrow('expo.ios.bundleIdentifier')
    expect(() =>
      withReportConfig(
        makeConfig({
          extra: {
            eas: { build: { experimental: { ios: { appExtensions: {} } } } },
          },
        }),
      ),
    ).toThrow('must be an array')
  })
})

describe('PhoneRestReport production approval gate', () => {
  it.each([undefined, false, 'true', 1])(
    'blocks production when distributionApproved is %p',
    (approval) => {
      process.env.EAS_BUILD_PROFILE = 'production'
      const config = makeConfig(
        approval === undefined
          ? {}
          : { extra: { phoneRest: { distributionApproved: approval } } },
      )
      const original = JSON.stringify(config)
      expect(() => withPhoneRestReport(config)).toThrow(
        'Apple Family Controls distribution approval for BOTH the host (com.example.gym) and report extension (com.example.gym.PhoneRestReport)',
      )
      expect(() => withPhoneRestReport(config)).toThrow(
        'set expo.extra.phoneRest.distributionApproved=true in app.json and rebuild',
      )
      expect(JSON.stringify(config)).toBe(original)
      expect(config.mods).toBeUndefined()
    },
  )

  it('permits an explicitly approved production prebuild without removing the extension', async () => {
    process.env.EAS_BUILD_PROFILE = 'production'
    const { directory, ios } = makeFixture()
    const config = await compileModsAsync(
      withPhoneRestReport(
        makeConfig({
          extra: { phoneRest: { distributionApproved: true, keep: 'report' } },
        }),
      ),
      { projectRoot: directory, platforms: ['ios'] },
    )
    expect(config.extra.phoneRest).toEqual({
      distributionApproved: true,
      keep: 'report',
    })
    expect(config.extra.eas.build.experimental.ios.appExtensions).toEqual([
      {
        targetName: TARGET_NAME,
        bundleIdentifier: 'com.example.gym.PhoneRestReport',
        entitlements: { [FAMILY_CONTROLS]: true },
      },
    ])
    const project = parseProject(
      fs.readFileSync(
        path.join(ios, 'gym.xcodeproj', 'project.pbxproj'),
        'utf8',
      ),
    )
    expect(nativeTarget(project)[1].productType).toBe(
      '"com.apple.product-type.app-extension"',
    )
    expect(
      fs.existsSync(path.join(ios, TARGET_NAME, 'PhoneRestReport.swift')),
    ).toBe(true)
  })

  it.each([undefined, 'development', 'preview'])(
    'keeps the same extension enabled without approval for profile %p',
    (profile) => {
      if (profile !== undefined) process.env.EAS_BUILD_PROFILE = profile
      const config = withPhoneRestReport(
        makeConfig({ extra: { phoneRest: { distributionApproved: false } } }),
      )
      expect(config.extra.phoneRest.distributionApproved).toBe(false)
      expect(config.extra.eas.build.experimental.ios.appExtensions).toEqual([
        {
          targetName: TARGET_NAME,
          bundleIdentifier: 'com.example.gym.PhoneRestReport',
          entitlements: { [FAMILY_CONTROLS]: true },
        },
      ])
      expect(config.mods.ios).toEqual({
        dangerous: expect.any(Function),
        entitlements: expect.any(Function),
        xcodeproj: expect.any(Function),
      })
    },
  )
})

describe('PhoneRestReport Xcode project', () => {
  it('creates an extension product with target-local sources, linked SDK frameworks and host signing/version settings', () => {
    const project = parseProject()
    const host = nativeTarget(project, 'gym')[1]
    const originalHostSettings = JSON.stringify(configurations(project, host))
    apply(project)
    const [targetId, target] = nativeTarget(project)
    expect(unquote(target.productType)).toBe(
      'com.apple.product-type.app-extension',
    )
    expect(
      project
        .getFirstProject()
        .firstProject.targets.filter(({ value }) => value === targetId),
    ).toHaveLength(1)
    expect(
      project.pbxFileReferenceSection()[target.productReference],
    ).toMatchObject({
      path: '"PhoneRestReport.appex"',
      explicitFileType: 'wrapper.app-extension',
      sourceTree: 'BUILT_PRODUCTS_DIR',
    })
    const sourcePhases = phases(project, target, 'PBXSourcesBuildPhase')
    const frameworkPhases = phases(project, target, 'PBXFrameworksBuildPhase')
    expect(sourcePhases).toHaveLength(1)
    expect(frameworkPhases).toHaveLength(1)
    expect(phases(project, target, 'PBXResourcesBuildPhase')).toEqual([
      expect.objectContaining({ files: [] }),
    ])
    const sourceReferences = buildReferences(project, sourcePhases[0])
    expect(
      sourceReferences.map((id) =>
        unquote(project.pbxFileReferenceSection()[id].path),
      ),
    ).toEqual(SOURCE_FILES.map((source) => path.basename(source)))
    const reportGroup = project.pbxGroupByName(TARGET_NAME)
    expect(unquote(reportGroup.path)).toBe(TARGET_NAME)
    expect(reportGroup.children).toHaveLength(5)
    expect(
      buildReferences(
        project,
        phases(project, host, 'PBXSourcesBuildPhase')[0],
      ),
    ).not.toEqual(expect.arrayContaining(sourceReferences))
    expect(
      buildReferences(project, frameworkPhases[0]).map((id) =>
        unquote(project.pbxFileReferenceSection()[id].path),
      ),
    ).toEqual([
      'System/Library/Frameworks/DeviceActivity.framework',
      'System/Library/Frameworks/SwiftUI.framework',
      'System/Library/Frameworks/FamilyControls.framework',
    ])
    expect(buildReferences(project, frameworkPhases[0])).toContain(SWIFTUI_ID)
    expect(frameworkPhases[0].files).not.toContainEqual(
      phases(project, host, 'PBXFrameworksBuildPhase')[0].files[0],
    )
    for (const configuration of configurations(project)) {
      const settings = Object.fromEntries(
        Object.entries(configuration.buildSettings).map(([key, value]) => [
          key,
          unquote(String(value)),
        ]),
      )
      expect(settings).toMatchObject({
        APPLICATION_EXTENSION_API_ONLY: 'YES',
        SKIP_INSTALL: 'YES',
        IPHONEOS_DEPLOYMENT_TARGET: '16.0',
        SWIFT_VERSION: '5.0',
        INFOPLIST_FILE: 'PhoneRestReport/Info.plist',
        CODE_SIGN_ENTITLEMENTS: 'PhoneRestReport/PhoneRestReport.entitlements',
        PRODUCT_BUNDLE_IDENTIFIER: 'com.example.gym.PhoneRestReport',
        CURRENT_PROJECT_VERSION: '27',
        MARKETING_VERSION: '2.3.4',
        TARGETED_DEVICE_FAMILY: '1,2',
        DEVELOPMENT_TEAM:
          configuration.name === 'Debug' ? 'DEBUGTEAM1' : 'RELEASETM1',
      })
    }
    expect(JSON.stringify(configurations(project, host))).toBe(
      originalHostSettings,
    )
    expect(dependencyTargets(project, host)).toEqual([targetId])
    const embed = phases(project, host, 'PBXCopyFilesBuildPhase')
    expect(embed).toHaveLength(1)
    expect(embed[0]).toMatchObject({ dstSubfolderSpec: 13, dstPath: '""' })
    expect(buildReferences(project, embed[0])).toEqual([
      target.productReference,
    ])
    expect(
      project.pbxBuildFileSection()[embed[0].files[0].value].settings
        .ATTRIBUTES,
    ).toContain('RemoveHeadersOnCopy')
    const dependency =
      project.hash.project.objects.PBXTargetDependency[
        host.dependencies[0].value
      ]
    expect(
      project.hash.project.objects.PBXContainerItemProxy[
        dependency.targetProxy
      ],
    ).toMatchObject({
      containerPortal: project.hash.project.rootObject,
      remoteGlobalIDString: targetId,
    })
  })

  it('is unchanged after serialization, parsing and a second application', () => {
    const project = apply(parseProject())
    const once = project.writeSync()
    const reapplied = apply(parseProject(once))
    expect(reapplied.writeSync()).toBe(once)
    expect(IOSConfig.Target.getNativeTargets(reapplied)).toHaveLength(2)
  })

  it('updates only extension versions/settings and retains custom target settings', () => {
    const project = apply(parseProject())
    const [id] = nativeTarget(project)
    for (const configuration of configurations(project)) {
      configuration.buildSettings.CUSTOM_SETTING = 'preserved'
    }
    const hostSettings = JSON.stringify(
      configurations(project, nativeTarget(project, 'gym')[1]),
    )
    apply(
      project,
      makeConfig({
        version: '3.1.0',
        ios: {
          buildNumber: '52',
          bundleIdentifier: 'com.example.renamed',
          supportsTablet: false,
        },
      }),
      'gym',
    )
    expect(nativeTarget(project)[0]).toBe(id)
    for (const configuration of configurations(project)) {
      expect(configuration.buildSettings).toMatchObject({
        MARKETING_VERSION: '"3.1.0"',
        CURRENT_PROJECT_VERSION: '"52"',
        PRODUCT_BUNDLE_IDENTIFIER: '"com.example.renamed.PhoneRestReport"',
        TARGETED_DEVICE_FAMILY: '"1"',
        CUSTOM_SETTING: 'preserved',
      })
    }
    expect(
      JSON.stringify(configurations(project, nativeTarget(project, 'gym')[1])),
    ).toBe(hostSettings)
  })

  it('selects the matching app instead of the first native target or first application', () => {
    const project = parseProject()
    const other = addOtherTarget(project, 'OtherApp')
    const tests = addOtherTarget(project, 'Tests', 'unit_test_bundle')
    const targets = project.pbxNativeTargetSection()
    project.hash.project.objects.PBXNativeTarget = {
      [tests.uuid]: targets[tests.uuid],
      [`${tests.uuid}_comment`]: 'Tests',
      [other.uuid]: targets[other.uuid],
      [`${other.uuid}_comment`]: 'OtherApp',
      ...targets,
    }
    const root = project.getFirstProject().firstProject
    root.targets = [tests.uuid, other.uuid, HOST_ID].map((id) =>
      root.targets.find(({ value }) => value === id),
    )
    const wrongTargets = JSON.stringify([
      other.pbxNativeTarget,
      tests.pbxNativeTarget,
    ])
    apply(project)
    apply(project)
    const [reportId, report] = nativeTarget(project)
    const host = nativeTarget(project, 'gym')[1]
    expect(JSON.stringify([other.pbxNativeTarget, tests.pbxNativeTarget])).toBe(
      wrongTargets,
    )
    expect(dependencyTargets(project, host)).toContain(reportId)
    expect(
      dependencyTargets(project, host).filter((id) => id === reportId),
    ).toHaveLength(1)
    expect(
      buildReferences(
        project,
        phases(project, host, 'PBXCopyFilesBuildPhase')[0],
      ),
    ).toContain(report.productReference)
    expect(project.getFirstTarget().uuid).toBe(tests.uuid)
  })

  it('reuses an existing app-extension embed phase and preserves another extension and dependency', () => {
    const project = parseProject()
    const widget = addOtherTarget(project, 'Widget', 'app_extension')
    const host = nativeTarget(project, 'gym')[1]
    const widgetBefore = JSON.stringify(widget.pbxNativeTarget)
    const settingsBefore = JSON.stringify(
      configurations(project, widget.pbxNativeTarget),
    )
    const embed = phases(project, host, 'PBXCopyFilesBuildPhase')[0]
    expect(buildReferences(project, embed)).toEqual([
      widget.pbxNativeTarget.productReference,
    ])
    const existingFiles = JSON.stringify(embed.files)
    const existingDependencies = JSON.stringify(host.dependencies)
    apply(project)
    apply(project)
    expect(phases(project, host, 'PBXCopyFilesBuildPhase')).toHaveLength(1)
    expect(embed.files).toHaveLength(JSON.parse(existingFiles).length + 1)
    expect(embed.files.slice(0, -1)).toEqual(JSON.parse(existingFiles))
    expect(host.dependencies.slice(0, -1)).toEqual(
      JSON.parse(existingDependencies),
    )
    expect(JSON.stringify(widget.pbxNativeTarget)).toBe(widgetBefore)
    expect(
      JSON.stringify(configurations(project, widget.pbxNativeTarget)),
    ).toBe(settingsBefore)
  })

  it('uses the Expo source-root target when a new host bundle identifier matches another app', () => {
    const project = parseProject()
    const other = addOtherTarget(project, 'OtherApp')
    const otherBefore = JSON.stringify(other.pbxNativeTarget)
    apply(
      project,
      makeConfig({ ios: { bundleIdentifier: 'com.example.OtherApp' } }),
      'gym',
    )
    const [reportId, report] = nativeTarget(project)
    const host = nativeTarget(project, 'gym')[1]
    expect(dependencyTargets(project, host)).toContain(reportId)
    expect(
      buildReferences(
        project,
        phases(project, host, 'PBXCopyFilesBuildPhase')[0],
      ),
    ).toContain(report.productReference)
    expect(JSON.stringify(other.pbxNativeTarget)).toBe(otherBefore)
  })

  it('inherits project signing when the host uses inherited signing and supports host configuration names', () => {
    const project = parseProject()
    const host = nativeTarget(project, 'gym')[1]
    const root = project.getFirstProject().firstProject
    for (const configuration of configurations(project, host)) {
      configuration.buildSettings.DEVELOPMENT_TEAM = '"$(inherited)"'
    }
    for (const configuration of configurations(project, root)) {
      configuration.buildSettings.DEVELOPMENT_TEAM = 'PROJECTTM1'
    }
    configurations(project, host)[0].name = 'Development'
    configurations(project, root)[0].name = 'Development'
    apply(project)
    expect(configurations(project).map(({ name }) => name)).toEqual([
      'Development',
      'Release',
    ])
    expect(
      configurations(project).map(
        ({ buildSettings }) => buildSettings.DEVELOPMENT_TEAM,
      ),
    ).toEqual(['"PROJECTTM1"', '"PROJECTTM1"'])
  })

  it('refuses ambiguous hosts and name collisions instead of modifying unrelated targets', () => {
    const ambiguous = parseProject()
    addOtherTarget(ambiguous, 'OtherApp')
    const before = ambiguous.writeSync()
    expect(() =>
      apply(
        ambiguous,
        makeConfig({ ios: { bundleIdentifier: 'com.example.unknown' } }),
      ),
    ).toThrow('uniquely identify')
    expect(ambiguous.writeSync()).toBe(before)
    const conflicting = parseProject()
    addOtherTarget(conflicting, TARGET_NAME)
    const conflictingBefore = conflicting.writeSync()
    expect(() => apply(conflicting)).toThrow('conflicting native target')
    expect(conflicting.writeSync()).toBe(conflictingBefore)
  })
})

describe('PhoneRestReport generated files and Expo mods', () => {
  it('copies canonical sources and generates report-only plists while preserving existing extension entitlements', async () => {
    const { directory, ios } = makeFixture()
    const options = getReportOptions(makeConfig())
    const reportDirectory = await writeReportFiles(directory, ios, options)
    const entitlementPath = path.join(
      reportDirectory,
      `${TARGET_NAME}.entitlements`,
    )
    fs.writeFileSync(
      entitlementPath,
      plist.build({ [FAMILY_CONTROLS]: false, 'get-task-allow': true }),
    )
    await writeReportFiles(directory, ios, options)
    expect(fs.readdirSync(reportDirectory).sort()).toEqual([
      'Info.plist',
      'PhoneRestEstimator.swift',
      'PhoneRestReport.entitlements',
      'PhoneRestReport.swift',
      'PhoneRestWindow.swift',
    ])
    for (const source of SOURCE_FILES) {
      expect(
        fs.readFileSync(
          path.join(reportDirectory, path.basename(source)),
          'utf8',
        ),
      ).toBe(
        fs.readFileSync(
          path.join(directory, 'modules', 'phone-rest', source),
          'utf8',
        ),
      )
    }
    expect(plist.parse(fs.readFileSync(entitlementPath, 'utf8'))).toEqual({
      [FAMILY_CONTROLS]: true,
      'get-task-allow': true,
    })
    expect(
      plist.parse(
        fs.readFileSync(path.join(reportDirectory, 'Info.plist'), 'utf8'),
      ),
    ).toEqual({
      CFBundleDisplayName: TARGET_NAME,
      CFBundleExecutable: '$(EXECUTABLE_NAME)',
      CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
      CFBundleInfoDictionaryVersion: '6.0',
      CFBundleName: '$(PRODUCT_NAME)',
      CFBundlePackageType: 'XPC!',
      CFBundleShortVersionString: '2.3.4',
      CFBundleVersion: '27',
      LSRequiresIPhoneOS: true,
      MinimumOSVersion: '16.0',
      NSExtension: {
        NSExtensionPointIdentifier:
          'com.apple.deviceactivityui.report-extension',
      },
    })
  })

  it('fails before creating a report directory when canonical sources are missing', async () => {
    const { directory, ios } = makeFixture()
    fs.unlinkSync(
      path.join(directory, 'modules', 'phone-rest', SOURCE_FILES[2]),
    )
    await expect(
      writeReportFiles(directory, ios, getReportOptions(makeConfig())),
    ).rejects.toMatchObject({ code: 'ENOENT' })
    expect(fs.existsSync(path.join(ios, TARGET_NAME))).toBe(false)
  })

  it('rejects non-dictionary entitlements instead of silently overwriting them', async () => {
    const { directory, ios } = makeFixture()
    const options = getReportOptions(makeConfig())
    const reportDirectory = await writeReportFiles(directory, ios, options)
    const entitlementsPath = path.join(
      reportDirectory,
      `${TARGET_NAME}.entitlements`,
    )
    const invalid = plist.build('not a dictionary')
    fs.writeFileSync(entitlementsPath, invalid)
    await expect(writeReportFiles(directory, ios, options)).rejects.toThrow(
      'entitlements must be a plist dictionary',
    )
    expect(fs.readFileSync(entitlementsPath, 'utf8')).toBe(invalid)
  })

  it('runs the actual Expo mod pipeline on clean and repeated non-clean fixture prebuilds', async () => {
    process.env.EAS_BUILD_PROFILE = 'development'
    const { directory, ios } = makeFixture()
    const config = makeConfig({
      ios: {
        entitlements: {
          'com.apple.developer.associated-domains': ['applinks:example.com'],
        },
      },
      extra: { eas: { projectId: 'preserved-project-id' } },
    })
    const compile = (appConfig) =>
      compileModsAsync(withPhoneRestReport(appConfig), {
        projectRoot: directory,
        platforms: ['ios'],
        assertMissingModProviders: true,
      })
    const first = await compile(config)
    expect(first.extra.phoneRest.distributionApproved).toBe(false)
    const projectPath = path.join(ios, 'gym.xcodeproj', 'project.pbxproj')
    const firstProject = fs.readFileSync(projectPath, 'utf8')
    await compile(config)
    expect(fs.readFileSync(projectPath, 'utf8')).toBe(firstProject)
    expect(first.extra.eas).toMatchObject({
      projectId: 'preserved-project-id',
      build: {
        experimental: {
          ios: {
            appExtensions: [
              {
                targetName: TARGET_NAME,
                bundleIdentifier: 'com.example.gym.PhoneRestReport',
                entitlements: { [FAMILY_CONTROLS]: true },
              },
            ],
          },
        },
      },
    })
    expect(
      plist.parse(
        fs.readFileSync(path.join(ios, 'gym', 'gym.entitlements'), 'utf8'),
      ),
    ).toEqual({
      'com.apple.developer.healthkit': true,
      'get-task-allow': true,
      'com.apple.developer.associated-domains': ['applinks:example.com'],
      [FAMILY_CONTROLS]: true,
    })
    expect(
      plist.parse(
        fs.readFileSync(
          path.join(ios, TARGET_NAME, `${TARGET_NAME}.entitlements`),
          'utf8',
        ),
      ),
    ).toEqual({
      [FAMILY_CONTROLS]: true,
    })
    const sourcePath = path.join(
      directory,
      'modules',
      'phone-rest',
      SOURCE_FILES[0],
    )
    fs.writeFileSync(sourcePath, '// Updated canonical source\n')
    await compile(makeConfig({ version: '4.0.0', ios: { buildNumber: '60' } }))
    expect(
      fs.readFileSync(
        path.join(ios, TARGET_NAME, 'PhoneRestReport.swift'),
        'utf8',
      ),
    ).toBe('// Updated canonical source\n')
    const updated = parseProject(fs.readFileSync(projectPath, 'utf8'))
    expect(IOSConfig.Target.getNativeTargets(updated)).toHaveLength(2)
    expect(configurations(updated)[0].buildSettings).toMatchObject({
      MARKETING_VERSION: '"4.0.0"',
      CURRENT_PROJECT_VERSION: '"60"',
    })
    expect(
      plist.parse(
        fs.readFileSync(path.join(ios, TARGET_NAME, 'Info.plist'), 'utf8'),
      ),
    ).toMatchObject({
      CFBundleShortVersionString: '4.0.0',
      CFBundleVersion: '60',
    })
    expect(nativeTarget(updated, 'gym')[0]).toBe(HOST_ID)
  })
})
