// Copyright 2019 Stanford University see Apache2.txt for license
module.exports = {
  plugins: [
    "import",
    "jest",
    "security"
  ],
  extends: [
    "eslint:recommended",
    "plugin:node/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:security/recommended",
    "plugin:jest/recommended"
  ],
  env: {
    "es6": true,
    "jest": true,
    "node": true
  },
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: "module"
  },
  overrides: [
    {
      "files": ["src/**/*.js",
                "__mocks__/**/*.js",
                "__tests__/**/*.js"],
      "rules": {
        // Indent `case` statements within `switch` blocks
        "indent": ["error", 2, {
          "SwitchCase": 1
        }],
        "import/namespace": "off",
        // See https://github.com/mysticatea/eslint-plugin-node/blob/master/docs/rules/no-unsupported-features/es-syntax.md
        //   rule supposedly matches ECMA version with node
        //   we get: "Import and export declarations are not supported yet"
        "node/no-unsupported-features/es-syntax": "off",
        // Avoiding: "warning  Found fs.readFileSync with non literal argument ..."
        "security/detect-non-literal-fs-filename": "off",
        // Avoiding: "warning Found non-literal argument to RegExp Constructor"
        "security/detect-non-literal-regexp": "off",
        // this is a CLI tool; we DO want to send output to console
        "no-console": "off",
        // allow unused variables that begin with underscore
        "no-unused-vars": [
          "error",
          {
            "argsIgnorePattern": "^_"
          }
        ]
      }
    },
    {
      // We aren't concerned about this in our tests, see:
      //   https://github.com/nodesecurity/eslint-plugin-security#detect-object-injection
      //   https://github.com/nodesecurity/eslint-plugin-security/blob/master/docs/the-dangers-of-square-bracket-notation.md
      //   https://security.stackexchange.com/questions/170648/variable-assigned-to-object-injection-sink-security-detect-object-injection
      // specifically, the variables in square brackets do not come from user input
      files: [
        '__tests__/**/*.js'
      ],
      rules: {
        'security/detect-object-injection': 'off',
      }
    },
    {
      // Allow skipped tests in test suite
      files: [
        '__tests__/**/*.js'
      ],
      rules: {
        'jest/no-disabled-tests': 'off',
      }
    }
  ]
}
