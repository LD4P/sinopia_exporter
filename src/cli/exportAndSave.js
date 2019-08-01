// Copyright 2019 Stanford University see LICENSE for license

import sinopiaExporter from '../../package'
import { downloadAllRdfForGroup } from '../getGroupRDF'


const helpText = `
> ./bin/export 'ucdavis'

and you should end up with something like:

$ tree sinopia_export/
sinopia_export/
└── ucdavis_2019-07-26T01:41:00.002Z
    ├── 0c9895ff-9470-4c70-bee4-b791ee179b34
    └── complete.log

each RDF resource will have its own file.  complete.log will be written at the end of a successful run.
`


console.debug(`arguments: ${process.argv}`)
console.info(`sinopia_exporter v${sinopiaExporter.version}`)


const groupName = process.argv[2]
if(groupName) {
  downloadAllRdfForGroup(groupName)
} else {
  console.error(helpText)
}
