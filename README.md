# Sinopia Exporter

## Docker export
Docker export performs an export of all groups, zips up the results, and exports to S3.

To build and run the Docker container:
```
docker build . -t "ld4p/sinopia_exporter"
docker run --rm "ld4p/sinopia_exporter"
```

To push:
```
docker push ld4p/sinopia_exporter
```

For local testing purposes, you may want to link in a local directory (`-v`) to view the results.

### Configuration
The export container uses the following environment variables:
* `S3_BUCKET`: For example, sinopia-exports-development
* `TRELLIS_BASEPATH`: For example, https://trellis.development.sinopia.io
