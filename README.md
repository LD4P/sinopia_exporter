# Sinopia Indexing Pipeline

## Docker export
Docker export performs an export of all groups, zips up the results, and exports to S3.

To build and run the Docker container:
```
docker build . -t "ld4p/export"
docker run --rm "ld4p/export"
```

For local testing purposes, you may want to link in a local directory (`-v`) to view the results.
