#!/bin/bash
BASE_DIR=$(cd $(dirname $0) && pwd -P)
BOOK_DIR=$BASE_DIR/../BennyhuoBook
TEMP_DIR=$BOOK_DIR/docs/.vuepress/.temp
SRC_DIR=$BOOK_DIR/docs

cd $SRC_DIR
ls
rm -R $(ls -d */)

cd $BASE_DIR/../source/build
cp -R gitbook/* $SRC_DIR/

rm $SRC_DIR/*/SUMMARY.md

cd $BOOK_DIR
npm run docs:build

cp -R $BOOK_DIR/docs/.vuepress/dist/* $BASE_DIR/../BennyhuoBlog/public/book/