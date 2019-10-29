#!/usr/bin/env bash
set -e

rm -fr exported_rdf/*

sh bin/export '_ALL_'
echo "Done exporting"

if [ -n "$S3_BUCKET" ]; then
  echo "Emptying bucket"
  aws s3 rm s3://$S3_BUCKET --recursive
fi

cd exported_rdf
ALLFILES=sinopia_export_all*
for allfile in $ALLFILES
do
  zip -q -r $allfile.zip $allfile/
  if [ -n "$S3_BUCKET" ]; then
    echo "Sending to S3"
    aws s3 cp $allfile.zip s3://$S3_BUCKET --acl public-read
  fi

  cd $allfile
  GROUPFILES=*_*
  for groupfile in $GROUPFILES
  do
    zip -q -r $groupfile.zip $groupfile/
    if [ -n "$S3_BUCKET" ]; then
      echo "Sending to S3"
      aws s3 cp $groupfile.zip s3://$S3_BUCKET --acl public-read
    fi
  done
done
echo "Done"
