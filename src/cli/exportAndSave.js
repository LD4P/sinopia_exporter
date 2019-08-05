// Copyright 2019 Stanford University see LICENSE for license

import sinopiaExporter from '../../package'
import { downloadAllRdfForGroup } from '../getGroupRDF'


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
  console.info(`beginning export of RDF from group: ${groupName}`)
  downloadAllRdfForGroup(groupName)
  console.info(`finished export of RDF from group: ${groupName}`)
} else {
  console.error(helpText)
  console.error('\nIt appears that no group name was specified.')
}
