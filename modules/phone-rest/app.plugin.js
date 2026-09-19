const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const {
  IOSConfig,
  withDangerousMod,
  withEntitlementsPlist,
  withXcodeProject,
} = require('expo/config-plugins')

const requireExpo = createRequire(require.resolve('expo/config-plugins'))
const requirePlugins = createRequire(
  requireExpo.resolve('@expo/config-plugins'),
)
const plist = requirePlugins('@expo/plist').default
const PBXFile = createRequire(requirePlugins.resolve('xcode'))('./lib/pbxFile')
const { getBuildConfigurationsForListId, unquote } = IOSConfig.XcodeUtils

const TARGET_NAME = 'PhoneRestReport'
const FAMILY_CONTROLS = 'com.apple.developer.family-controls'
const SOURCE_FILES = [
  'report/PhoneRestReport.swift',
  'report/PhoneRestEstimator.swift',
  'shared/PhoneRestWindow.swift',
]
const FRAMEWORKS = [
  'DeviceActivity.framework',
  'SwiftUI.framework',
  'FamilyControls.framework',
]
const text = (value) => unquote(String(value ?? ''))
const quote = (value) => JSON.stringify(String(value))

function getAppExtensions(config) {
  const extensions =
    config.extra?.eas?.build?.experimental?.ios?.appExtensions ?? []
  if (!Array.isArray(extensions)) {
    throw new Error('PhoneRestReport: EAS ios.appExtensions must be an array.')
  }
  return extensions
}

function getExistingMetadata(config) {
  return getAppExtensions(config)
    .filter((entry) => entry.targetName === TARGET_NAME)
    .reduce(
      (previous, entry) => ({
        ...previous,
        ...entry,
        entitlements: { ...previous.entitlements, ...entry.entitlements },
      }),
      {},
    )
}

function getReportOptions(config) {
  const hostBundleIdentifier = config.ios?.bundleIdentifier
  if (!hostBundleIdentifier) {
    throw new Error('PhoneRestReport requires expo.ios.bundleIdentifier.')
  }
  return {
    hostBundleIdentifier,
    bundleIdentifier: `${hostBundleIdentifier}.${TARGET_NAME}`,
    version: IOSConfig.Version.getVersion(config),
    buildNumber: IOSConfig.Version.getBuildNumber(config),
    deviceFamilies: IOSConfig.DeviceFamily.getDeviceFamilies(config),
    appleTeamId: config.ios.appleTeamId,
    entitlements: {
      ...getExistingMetadata(config).entitlements,
      [FAMILY_CONTROLS]: true,
    },
  }
}

function withReportConfig(config) {
  const options = getReportOptions(config)
  const metadata = {
    ...getExistingMetadata(config),
    targetName: TARGET_NAME,
    bundleIdentifier: options.bundleIdentifier,
    entitlements: options.entitlements,
  }
  let inserted = false
  const appExtensions = getAppExtensions(config).flatMap((entry) => {
    if (entry.targetName !== TARGET_NAME) return [entry]
    if (inserted) return []
    inserted = true
    return [metadata]
  })
  if (!inserted) appExtensions.push(metadata)

  const extra = config.extra ?? {}
  const eas = extra.eas ?? {}
  const build = eas.build ?? {}
  const experimental = build.experimental ?? {}
  return {
    ...config,
    ios: {
      ...config.ios,
      entitlements: { ...config.ios.entitlements, [FAMILY_CONTROLS]: true },
    },
    extra: {
      ...extra,
      phoneRest: {
        ...extra.phoneRest,
        distributionApproved: extra.phoneRest?.distributionApproved === true,
      },
      eas: {
        ...eas,
        build: {
          ...build,
          experimental: {
            ...experimental,
            ios: { ...experimental.ios, appExtensions },
          },
        },
      },
    },
  }
}

async function writeReportFiles(projectRoot, platformProjectRoot, options) {
  const moduleRoot = path.join(projectRoot, 'modules', 'phone-rest')
  // Read all canonical sources before writing, so an incomplete checkout fails early.
  const sources = await Promise.all(
    SOURCE_FILES.map(async (relativePath) => ({
      name: path.basename(relativePath),
      contents: await fs.promises.readFile(path.join(moduleRoot, relativePath)),
    })),
  )
  const directory = path.join(platformProjectRoot, TARGET_NAME)
  const entitlementsPath = path.join(directory, `${TARGET_NAME}.entitlements`)
  let existingEntitlements = {}
  try {
    existingEntitlements = plist.parse(
      await fs.promises.readFile(entitlementsPath, 'utf8'),
    )
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  if (
    !existingEntitlements ||
    typeof existingEntitlements !== 'object' ||
    Array.isArray(existingEntitlements)
  ) {
    throw new Error('PhoneRestReport: entitlements must be a plist dictionary.')
  }
  const infoPlist = {
    CFBundleDisplayName: TARGET_NAME,
    CFBundleExecutable: '$(EXECUTABLE_NAME)',
    CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
    CFBundleInfoDictionaryVersion: '6.0',
    CFBundleName: '$(PRODUCT_NAME)',
    CFBundlePackageType: 'XPC!',
    CFBundleShortVersionString: options.version,
    CFBundleVersion: options.buildNumber,
    LSRequiresIPhoneOS: true,
    MinimumOSVersion: '16.0',
    NSExtension: {
      NSExtensionPointIdentifier: 'com.apple.deviceactivityui.report-extension',
    },
  }
  await fs.promises.mkdir(directory, { recursive: true })
  await Promise.all([
    ...sources.map(({ name, contents }) =>
      fs.promises.writeFile(path.join(directory, name), contents),
    ),
    fs.promises.writeFile(
      path.join(directory, 'Info.plist'),
      plist.build(infoPlist),
    ),
    fs.promises.writeFile(
      entitlementsPath,
      plist.build({ ...existingEntitlements, ...options.entitlements }),
    ),
  ])
  return directory
}

function getHostTarget(project, options, projectName) {
  const applications = IOSConfig.Target.getNativeTargets(project).filter(
    ([, target]) =>
      IOSConfig.Target.isTargetOfType(
        target,
        IOSConfig.Target.TargetType.APPLICATION,
      ),
  )
  // Expo's source-root name remains stable while prebuild updates bundle identifiers.
  const named = applications.filter(
    ([, target]) => text(target.name) === projectName,
  )
  if (named.length === 1) return named[0]
  const matches = applications.filter(([, target]) =>
    getBuildConfigurationsForListId(
      project,
      target.buildConfigurationList,
    ).some(
      ([, configuration]) =>
        text(configuration.buildSettings.PRODUCT_BUNDLE_IDENTIFIER) ===
        options.hostBundleIdentifier,
    ),
  )
  if (matches.length === 1) return matches[0]
  if (matches.length === 0 && applications.length === 1) return applications[0]
  throw new Error(
    'PhoneRestReport: cannot uniquely identify the host application target; refusing to attach to the first target.',
  )
}

function ensureGroup(project, name, groupPath) {
  const mainGroup = project.getPBXGroupByKey(
    project.getFirstProject().firstProject.mainGroup,
  )
  const existing = mainGroup.children
    .map(({ value }) => project.getPBXGroupByKey(value))
    .find((group) => group && text(group.name ?? group.path) === name)
  if (existing) {
    if (text(existing.path) !== groupPath) {
      throw new Error(`PhoneRestReport: conflicting Xcode group "${name}".`)
    }
    return existing
  }
  const created = project.addPbxGroup([], name, groupPath || undefined)
  mainGroup.children.push({ value: created.uuid, comment: name })
  return created.pbxGroup
}

function ensureFile(project, group, filename, fileOptions) {
  const references = project.pbxFileReferenceSection()
  const existing = group.children.find(
    ({ value }) => text(references[value]?.path) === filename,
  )
  if (existing)
    return { fileRef: existing.value, basename: path.basename(filename) }
  const file = new PBXFile(filename, fileOptions)
  file.fileRef = project.generateUuid()
  project.addToPbxFileReferenceSection(file)
  group.children.push({ value: file.fileRef, comment: file.basename })
  return file
}

function getPhases(project, target, type) {
  return (target.buildPhases ?? [])
    .map(({ value }) => project.hash.project.objects[type]?.[value])
    .filter(Boolean)
}

function ensurePhase(project, targetId, target, type, name) {
  return (
    getPhases(project, target, type)[0] ??
    project.addBuildPhase([], type, name, targetId).buildPhase
  )
}

function ensureBuildFile(project, phase, file, group, attributes = []) {
  const buildFiles = project.pbxBuildFileSection()
  let entry = phase.files.find(
    ({ value }) => buildFiles[value]?.fileRef === file.fileRef,
  )
  if (!entry) {
    const uuid = project.generateUuid()
    project.addToPbxBuildFileSection({ ...file, uuid, group })
    entry = { value: uuid, comment: `${file.basename} in ${group}` }
    phase.files.push(entry)
  }
  if (attributes.length) {
    const buildFile = buildFiles[entry.value]
    buildFile.settings = {
      ...buildFile.settings,
      ATTRIBUTES: [
        ...new Set([...(buildFile.settings?.ATTRIBUTES ?? []), ...attributes]),
      ],
    }
  }
}

function createReportTarget(project, host) {
  const uuid = project.generateUuid()
  const configurations = getBuildConfigurationsForListId(
    project,
    host.buildConfigurationList,
  )
  const configurationList = project.addXCConfigurationList(
    configurations.map(([, configuration]) => ({
      isa: 'XCBuildConfiguration',
      name: configuration.name,
      buildSettings: {},
    })),
    project.pbxXCConfigurationList()[host.buildConfigurationList]
      .defaultConfigurationName,
    `Build configuration list for PBXNativeTarget "${TARGET_NAME}"`,
  )
  ensureGroup(project, 'Products', '')
  const product = project.addProductFile(TARGET_NAME, {
    target: uuid,
    explicitFileType: 'wrapper.app-extension',
  })
  const target = {
    isa: 'PBXNativeTarget',
    name: quote(TARGET_NAME),
    productName: quote(TARGET_NAME),
    productType: quote(IOSConfig.Target.TargetType.EXTENSION),
    productReference: product.fileRef,
    productReference_comment: product.basename,
    buildConfigurationList: configurationList.uuid,
    buildConfigurationList_comment: `Build configuration list for PBXNativeTarget "${TARGET_NAME}"`,
    buildPhases: [],
    buildRules: [],
    dependencies: [],
  }
  // xcode.addTarget() embeds and adds dependencies to getFirstTarget(), which may be unrelated.
  project.addToPbxNativeTargetSection({ uuid, pbxNativeTarget: target })
  project.addToPbxProjectSection({ uuid, pbxNativeTarget: target })
  return [uuid, target]
}

function updateBuildSettings(project, target, hostId, host, options) {
  const hostConfigurations = getBuildConfigurationsForListId(
    project,
    host.buildConfigurationList,
  )
  const root = project.getFirstProject().firstProject
  const projectConfigurations = getBuildConfigurationsForListId(
    project,
    root.buildConfigurationList,
  )
  for (const [, configuration] of getBuildConfigurationsForListId(
    project,
    target.buildConfigurationList,
  )) {
    const settingsForName = (configurations) =>
      configurations.find(
        ([, item]) => text(item.name) === text(configuration.name),
      )?.[1].buildSettings
    const team = [
      settingsForName(hostConfigurations)?.DEVELOPMENT_TEAM,
      settingsForName(projectConfigurations)?.DEVELOPMENT_TEAM,
      root.attributes?.TargetAttributes?.[hostId]?.DevelopmentTeam,
      options.appleTeamId,
    ].find((value) => text(value) && text(value) !== '$(inherited)')
    Object.assign(configuration.buildSettings, {
      APPLICATION_EXTENSION_API_ONLY: 'YES',
      CODE_SIGN_ENTITLEMENTS: quote(
        `${TARGET_NAME}/${TARGET_NAME}.entitlements`,
      ),
      CODE_SIGN_STYLE: 'Automatic',
      CURRENT_PROJECT_VERSION: quote(options.buildNumber),
      GENERATE_INFOPLIST_FILE: 'NO',
      INFOPLIST_FILE: quote(`${TARGET_NAME}/Info.plist`),
      IPHONEOS_DEPLOYMENT_TARGET: '16.0',
      LD_RUNPATH_SEARCH_PATHS:
        '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
      MARKETING_VERSION: quote(options.version),
      PRODUCT_BUNDLE_IDENTIFIER: quote(options.bundleIdentifier),
      PRODUCT_NAME: quote(TARGET_NAME),
      SDKROOT: 'iphoneos',
      SKIP_INSTALL: 'YES',
      SUPPORTED_PLATFORMS: '"iphoneos iphonesimulator"',
      SUPPORTS_MACCATALYST: 'NO',
      SWIFT_VERSION: '5.0',
      TARGETED_DEVICE_FAMILY: IOSConfig.DeviceFamily.formatDeviceFamilies(
        options.deviceFamilies,
      ),
    })
    if (team) configuration.buildSettings.DEVELOPMENT_TEAM = quote(text(team))
  }
}

function ensureReportTarget(project, options, projectName) {
  const [hostId, host] = getHostTarget(project, options, projectName)
  const existing = IOSConfig.Target.getNativeTargets(project).filter(
    ([, target]) => text(target.name) === TARGET_NAME,
  )
  if (
    existing.length > 1 ||
    (existing.length === 1 &&
      !IOSConfig.Target.isTargetOfType(
        existing[0][1],
        IOSConfig.Target.TargetType.EXTENSION,
      ))
  ) {
    throw new Error(
      'PhoneRestReport: conflicting native target; refusing to overwrite it.',
    )
  }
  const [targetId, target] = existing[0] ?? createReportTarget(project, host)
  updateBuildSettings(project, target, hostId, host, options)

  const sources = ensurePhase(
    project,
    targetId,
    target,
    'PBXSourcesBuildPhase',
    'Sources',
  )
  const frameworks = ensurePhase(
    project,
    targetId,
    target,
    'PBXFrameworksBuildPhase',
    'Frameworks',
  )
  ensurePhase(project, targetId, target, 'PBXResourcesBuildPhase', 'Resources')
  const group = ensureGroup(project, TARGET_NAME, TARGET_NAME)
  for (const source of SOURCE_FILES) {
    ensureBuildFile(
      project,
      sources,
      ensureFile(project, group, path.basename(source)),
      'Sources',
    )
  }
  ensureFile(project, group, 'Info.plist')
  ensureFile(project, group, `${TARGET_NAME}.entitlements`, {
    lastKnownFileType: 'text.plist.entitlements',
  })

  const frameworkGroup = ensureGroup(project, 'Frameworks', '')
  for (const framework of FRAMEWORKS) {
    const filename = `System/Library/Frameworks/${framework}`
    const existingReference = Object.entries(
      project.pbxFileReferenceSection(),
    ).find(
      ([key, reference]) =>
        !key.endsWith('_comment') &&
        text(reference.path) === filename &&
        text(reference.sourceTree) === 'SDKROOT',
    )
    const file = existingReference
      ? { fileRef: existingReference[0], basename: framework }
      : ensureFile(project, frameworkGroup, filename)
    ensureBuildFile(project, frameworks, file, 'Frameworks')
  }

  const productReference =
    project.pbxFileReferenceSection()[target.productReference]
  if (
    !productReference ||
    text(productReference.explicitFileType) !== 'wrapper.app-extension'
  ) {
    throw new Error(
      'PhoneRestReport: missing or invalid extension product reference.',
    )
  }
  const product = {
    fileRef: target.productReference,
    basename: `${TARGET_NAME}.appex`,
  }
  const embedPhases = getPhases(project, host, 'PBXCopyFilesBuildPhase').filter(
    (phase) =>
      Number(phase.dstSubfolderSpec) === 13 && text(phase.dstPath) === '',
  )
  const embed =
    embedPhases.find((phase) =>
      phase.files.some(
        ({ value }) =>
          project.pbxBuildFileSection()[value]?.fileRef === product.fileRef,
      ),
    ) ??
    embedPhases[0] ??
    project.addBuildPhase(
      [],
      'PBXCopyFilesBuildPhase',
      'Embed App Extensions',
      hostId,
      'app_extension',
    ).buildPhase
  ensureBuildFile(project, embed, product, 'Embed App Extensions', [
    'RemoveHeadersOnCopy',
  ])

  const objects = project.hash.project.objects
  objects.PBXTargetDependency ??= {}
  objects.PBXContainerItemProxy ??= {}
  host.dependencies ??= []
  if (
    !host.dependencies.some(
      ({ value }) => objects.PBXTargetDependency[value]?.target === targetId,
    )
  ) {
    project.addTargetDependency(hostId, [targetId])
  }
  return project
}

function withPhoneRestReport(config) {
  // Family Controls distribution approval must still be granted by Apple for both identifiers.
  config = withReportConfig(config)
  if (
    process.env.EAS_BUILD_PROFILE === 'production' &&
    config.extra.phoneRest.distributionApproved !== true
  ) {
    throw new Error(
      `PhoneRestReport: production builds are blocked. Obtain Apple Family Controls distribution approval for BOTH the host (${config.ios.bundleIdentifier}) and report extension (${config.ios.bundleIdentifier}.${TARGET_NAME}). Only after both approvals, set expo.extra.phoneRest.distributionApproved=true in app.json and rebuild.`,
    )
  }
  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults[FAMILY_CONTROLS] = true
    return mod
  })
  config = withDangerousMod(config, [
    'ios',
    async (mod) => {
      await writeReportFiles(
        mod.modRequest.projectRoot,
        mod.modRequest.platformProjectRoot,
        getReportOptions(mod),
      )
      return mod
    },
  ])
  return withXcodeProject(config, (mod) => {
    ensureReportTarget(
      mod.modResults,
      getReportOptions(mod),
      mod.modRequest.projectName,
    )
    return mod
  })
}

module.exports = withPhoneRestReport
module.exports.TARGET_NAME = TARGET_NAME
module.exports.SOURCE_FILES = SOURCE_FILES
module.exports.getReportOptions = getReportOptions
module.exports.withReportConfig = withReportConfig
module.exports.writeReportFiles = writeReportFiles
module.exports.ensureReportTarget = ensureReportTarget
