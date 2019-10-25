#!/usr/bin/env bash
set -e

rm -fr exported_rdf/*

sh bin/export '_ALL_'

cd exported_rdf
ALLFILES=sinopia_export_all*
for allfile in $ALLFILES
do
  echo $allfile
  zip -r $allfile.zip $allfile/
  cd $allfile
  GROUPFILES=*_*
  for groupfile in $GROUPFILES
  do
    echo $groupfile
    zip -r $groupfile.zip $groupfile/
  done
  cd ..
  mv $allfile/*.zip .
done
echo "Done"
