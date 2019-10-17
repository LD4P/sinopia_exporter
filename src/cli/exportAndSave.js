// Copyright 2019 Stanford University see LICENSE for license

import sinopiaExporter from '../../package'
import { downloadAllRdfForGroup, downloadAllRdfForAllGroups } from '../getGroupRDF'


const helpText = `
Invoke the bin/export script with the name of the group to be exported
as a parameter.  E.g. to export RDF for the ucdavis group:

$ ./bin/export 'ucdavis'

...which should leave you with output like:

$ tree exported_rdf/
exported_rdf/
└── ucdavis_2019-08-05T23:11:54.601Z
    ├── 0c9895ff-9470-4c70-bee4-b791ee179b34
    └── complete.log

* The output will land in the configured exportBasePath (defaults to
  './exported_rdf'), in a subdirectory named for the exported group and
  the time at which the export was run.
* Each RDF resource will have its own file (named for the resource).
* complete.log will be written at the end of a successful run.
`


console.info(`sinopia_exporter v${sinopiaExporter.version}`)

const groupName = process.argv[2]
if(groupName) {
  // TODO: if groupName == '_ALL_', export everything?
  //  or, some CLI parsing options other than commander:
  //  https://nodejs.org/en/knowledge/command-line/how-to-parse-command-line-arguments/  (talks about yargs)
  //    https://github.com/yargs/yargs
  //  https://github.com/ankurdubey521/CommandLineParser
  //  https://duckduckgo.com/?q=javascript+command+line+parser&t=ffab&ia=web
  if(groupName == '_ALL_') {
    downloadAllRdfForAllGroups()
  } else {
    downloadAllRdfForGroup(groupName)
  }
} else {
  console.error(helpText)
  console.error('\nIt appears that no group name was specified.')
}
