# Sinopia Exporter

[![CircleCI](https://circleci.com/gh/LD4P/sinopia_exporter.svg?style=svg)](https://circleci.com/gh/LD4P/sinopia_exporter)
[![Code Climate](https://codeclimate.com/github/LD4P/sinopia_exporter/badges/gpa.svg)](https://codeclimate.com/github/LD4P/sinopia_exporter)
[![Code Climate Test Coverage](https://codeclimate.com/github/LD4P/sinopia_exporter/badges/coverage.svg)](https://codeclimate.com/github/LD4P/sinopia_exporter/coverage)
[![Docker Image Version (latest semver)](https://img.shields.io/docker/v/ld4p/sinopia_exporter?sort=semver)](https://hub.docker.com/repository/docker/ld4p/sinopia_exporter/tags?page=1&ordering=last_updated)

## Plain local export

### Dependencies

This is a Node project, so once you clone the repo, you'll want to do an `npm install` if you intend
to run the app natively (the `bin/export` script is a very thin wrapper).

### Usage

Invoke the `bin/export` script with the name of the group to be exported
as a parameter.  E.g. to export RDF for the `ucdavis` group:

```sh
$ ./bin/export -g ucdavis # group name in Sinopia

or

$ ./bin/export --group=ucdavis
```

...which should leave you with output like:

```sh
$ tree exported_rdf/
exported_rdf/
└── ucdavis_2019-08-05T23:11:54.601Z
    ├── 0c9895ff-9470-4c70-bee4-b791ee179b34
    └── complete.log
```

* The output will land in the configured `exportBasePath` (defaults to
  `./exported_rdf`), in a subdirectory named for the exported group and
  the time at which the export was run.
* Each RDF resource will have its own file (named for the resource).
* `complete.log` will be written at the end of a successful run.


Alternatively, instead of a group, you can export from all groups at once by specifying
`-a` or `--all` instead of a group name, e.g.:

```sh
$ ./bin/export -a

or

$ ./bin/export --all
```

...which should leave you with output similar to what's described above, but with a
directory for each group, all inside of one containing directory for the export, named
`sinopia_export_all_<date>`, e.g.:

```sh
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
```

## Docker export
Docker export performs an export of all groups, and zips up the results.  If provided with the `S3_BUCKET` env var, it will clear the specified S3 bucket, then copy the newly exported resources to it.

To build and run the Docker container:
```sh
docker build . -t "ld4p/sinopia_exporter"
docker run --rm "ld4p/sinopia_exporter"
```

To push:
```sh
docker push ld4p/sinopia_exporter
```

For local testing purposes, you may want to link in a local directory (`-v`) to view the results.  E.g.:

```sh
docker run --rm -v ~/data/ld4p/sinopia_exporter/exported_rdf:/home/circleci/exported_rdf "ld4p/sinopia_exporter"
```

### Configuration
The export container uses the following environment variables:
* `S3_BUCKET`: For example, sinopia-exports-development

### Linters

There are two linters/formatters used in this project: eslint and prettier.
They can be run together or individually.

To run both:
`npm run lint`

To auto-fix errors in both (where possible):
`npm run fix`

To run just eslint:
`npm run eslint`

To automatically fix just eslint problems (where possible):
`npm run eslint-fix`

To run just prettier:
`npm run pretty`

To automatically fix just prettier problems (where possible):
`npm run pretty-fix`
