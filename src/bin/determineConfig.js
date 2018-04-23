import fs from 'fs'
import path from 'path'
import readPkgUp from 'read-pkg-up'

import ValidationError from '../app/errors/ValidationError'
import logger from '../logger'

const readConfigFile = configFilePath => {
    try {
        return fs.readFileSync(configFilePath, 'utf8')
    } catch (error) {
        logger.error(`Exception while trying to read JSON config file`, error)
        return null
    }
}

const getConfigFileJson = configFilePath => {
    const configFileContents = readConfigFile(configFilePath)
    if (!configFileContents) {
        throw new ValidationError(
            `Could not find JSON config file: ${configFilePath}}`,
        )
    }
    try {
        return JSON.parse(configFileContents)
    } catch (error) {
        logger.error(`Exception while parsing JSON config`, error)
        throw new ValidationError(
            `Could not parse JSON config file: ${configFilePath}`,
        )
    }
}

const getConfigFileJS = configFilePath => {
    const projectDir = path.resolve(fs.realpathSync(process.cwd()))
    const fullPath = `${projectDir}/${configFilePath}`
    try {
        return require(fullPath) // eslint-disable-line global-require
    } catch (error) {
        logger.error(`Exception while loading JS config`, error)
        throw new ValidationError(
            `Exception while loading JS config: ${fullPath}`,
        )
    }
}

const getConfigFileContents = configFilePath => {
    if (configFilePath.endsWith('.js')) {
        return getConfigFileJson(getConfigFileJS)
    }
    return getConfigFileJson(configFilePath)
}

const determineConfig = cliOptions => {
    const pkgJson = readPkgUp.sync().pkg
    let pkgJsonBundlesize = pkgJson.bundlesize

    if (cliOptions.args && cliOptions.args.length > 0) {
        if (pkgJsonBundlesize) {
            logger.warn(
                `CLI files supplied, config in package.json will be ignored`,
            )
        }
        if (cliOptions.configFilePath) {
            logger.warn(
                `CLI files supplied, configFilePath will be ignored (this must be used on its own)`,
            )
        }

        const files = cliOptions.args.map(filePathGlob => {
            return {
                path: filePathGlob,
                maxSize: cliOptions.maxSize,
            }
        })

        return {
            files,
            defaultCompression: cliOptions.compression || 'gzip',
        }
    }

    if (cliOptions.configFilePath) {
        if (pkgJsonBundlesize) {
            logger.warn(
                `configFilePath supplied, config in package.json will be ignored`,
            )
            return getConfigFileContents(cliOptions.configFilePath)
        }
    }

    if (pkgJsonBundlesize) {
        if (Array.isArray(pkgJsonBundlesize)) {
            return {
                files: pkgJsonBundlesize,
            }
        }
        return pkgJsonBundlesize
    }

    return {}
}

export default determineConfig
