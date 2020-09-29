// Copyright 2019 Stanford University see LICENSE for license

import sinopiaExporter from '../../package'
import { downloadAllRdfForGroup, downloadAllRdfForAllGroups } from '../getGroupRDF'

var argv = require('yargs')
  .alias('g', 'group')
  .describe('g', 'The name of the group to be exported')
  .alias('a', 'all')
  .describe('a', 'Export all groups')
  .help('h')
  .alias('h', 'help')
  .argv;

const helpText = `
Invoke the bin/export script with the name of the group to be exported
as a parameter.  E.g. to export RDF for the ucdavis group:

$ ./bin/export -g ucdavis [--group=ucdavis]

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


Alternatively, instead of a group, you can export from all groups by specifying
-a or --all instead of a group name, e.g.:

$ ./bin/export -a [--all]

...which should leave you with output similar to what's described above, but with a
directory for each group, all inside of one containing directory for the export, named
'sinopia_export_all_<date>', e.g.:

$ tree exported_rdf/
exported_rdf/
└── sinopia_export_all_2019-10-20T07:29:16.412Z
    ├── complete.log
    ├── group1_2019-10-20T07:29:16.412Z
    │   ├── complete.log
    │   ├── resource1
    │   ├── resource2
    │   └── resource3
    ├── group2_2019-10-20T07:29:16.412Z
    │   ├── complete.log
    │   ├── resource4
    │   ├── resource5
    │   └── resource6
    └── group3_2019-10-20T07:29:16.412Z
        ├── complete.log
        ├── resource7
        ├── resource8
        └── resource9
`


console.info(`sinopia_exporter v${sinopiaExporter.version}`)

const groupName = argv.group

if (groupName) {
  downloadAllRdfForGroup(groupName)
} else {
  if (argv.all) {
    downloadAllRdfForAllGroups()
  } else {
    console.error(helpText)
    console.error('\nIt appears that no group name was specified.') 
  }
}
