#!/bin/bash
BASE_DIR=$(cd $(dirname $0) && pwd -P)
BOOK_DIR=$BASE_DIR/../BennyhuoBook
TEMP_DIR=$BOOK_DIR/docs/.vuepress/.temp
SRC_DIR=$BOOK_DIR/docs

cd $SRC_DIR
ls
rm -R $(ls)

cd $BASE_DIR/../source/build
cp -R gitbook/* $SRC_DIR/

