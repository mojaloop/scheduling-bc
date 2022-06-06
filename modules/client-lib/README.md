# scheduling-svc

[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/scheduling-bc.svg?style=flat)](https://github.com/mojaloop/scheduling-bc/commits/master)
[![Git Releases](https://img.shields.io/github/release/mojaloop/scheduling-bc.svg?style=flat)](https://github.com/mojaloop/scheduling-bc/releases)
[![Npm Version](https://img.shields.io/npm/v/@mojaloop-poc/scheduling-bc.svg?style=flat)](https://www.npmjs.com/package/@mojaloop-poc/scheduling-bc)
[![NPM Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/@mojaloop/scheduling-bc.svg?style=flat)](https://www.npmjs.com/package/@mojaloop-poc/scheduling-bc)
[![CircleCI](https://circleci.com/gh/mojaloop/scheduling-bc.svg?style=svg)](https://circleci.com/gh/mojaloop/scheduling-bc)

Mojaloop Scheduling Service

## Usage

### Install Node version

More information on how to install NVM: https://github.com/nvm-sh/nvm

```bash
nvm install
nvm use
```

### Install Yarn

```bash
npm -g yarn
```

### Install Dependencies

```bash
yarn
```

## Build

```bash
yarn build
```

## Run

```bash
yarn start
```

## Unit Tests

```bash
yarn test:unit
```

## Known Issues

- added `typescript` to [.ncurc.json](./.ncurc.json) as the `dep:update` script will install a non-supported version of typescript
