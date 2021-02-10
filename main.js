const jq = require('jsonpath');
const { query: queryXPath } = require('insomnia-xpath');

module.exports.templateTags = [
  {
    displayName: 'Body value',
    name: 'bodyvalue',
    description: 'from current request',
    args: [
      {
        displayName: 'Filter method',
        type: 'enum',
        options: [
          {
            displayName: 'JSONPath',
            description: 'filter by JSONPath',
            value: 'jsonpath',
          },
          {
            displayName: 'XPath',
            description: 'filter by XPath',
            value: 'xpath',
          },
        ],
      },
      {
        type: 'string',
        displayName: args => {
          switch (args[0].value) {
            case 'xpath':
              return 'XPath Syntax';
            case 'jsonpath':
              return 'JSONPath Syntax';
            default:
              return 'Syntax';
          }
        },
      },
    ],
    async run(context, method, filter) {
      const { meta } = context;

      if (!meta.requestId || !meta.workspaceId) {
        return null;
      }

      const request = await context.util.models.request.getById(meta.requestId);
      const workspace = await context.util.models.workspace.getById(meta.workspaceId);

      if (!request) {
        throw new Error(`Request not found for ${meta.requestId}`);
      }

      if (!workspace) {
        throw new Error(`Workspace not found for ${meta.workspaceId}`);
      }

      if (method == 'jsonpath') {
        return matchJSONPath(request.body.text, filter);
      } else {
        return matchXPath(request.body.text, filter);
      }
    },
  },
];

function matchJSONPath(bodyStr, query) {
  let body;
  let results;

  try {
    body = JSON.parse(bodyStr);
  } catch (err) {
    throw new Error(`Invalid JSON: ${err.message}`);
  }

  try {
    results = jq.query(body, query);
  } catch (err) {
    throw new Error(`Invalid JSONPath query: ${query}`);
  }

  if (results.length === 0) {
    throw new Error(`Returned no results: ${query}`);
  } else if (results.length > 1) {
    throw new Error(`Returned more than one result: ${query}`);
  }

  if (typeof results[0] !== 'string') {
    return JSON.stringify(results[0]);
  } else {
    return results[0];
  }
}

function matchXPath(bodyStr, query) {
  const results = queryXPath(bodyStr, query);

  if (results.length === 0) {
    throw new Error(`Returned no results: ${query}`);
  } else if (results.length > 1) {
    throw new Error(`Returned more than one result: ${query}`);
  }

  return results[0].inner;
}