WORKING_DIR=$(basename $(pwd))
git init
git checkout -b $WORKING_DIR
git add .
git commit -m 'update'

git remote add origin https://github.com/bennyhuo/Books.git
git push --force origin $WORKING_DIR
git gc