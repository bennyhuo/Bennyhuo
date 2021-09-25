import os
import re
import shutil
import sys

import yaml

PARTS = ['header', 'footer']


def get_build_dir(category):
    return os.path.join(os.curdir, 'build', category)


def get_categories():
    return [*filter(lambda f: os.path.isdir(os.path.join(os.curdir, 'parts', f)),
                  os.listdir(os.path.join(os.curdir, 'parts')))]


def get_parts_dir(category):
    return os.path.join(os.curdir, 'parts', category)


def get_part_file_path(category, part):
    return os.path.join(os.curdir, 'parts', category, part + ".md")


def get_post_files():
    return [*filter(lambda f: f.endswith('md'),
                    map(lambda f: os.path.join(os.curdir, 'posts', f),
                        os.listdir(os.path.join(os.curdir, 'posts'))))]


def retrieve_post_meta(post_file):
    file_name = os.path.basename(post_file.name).rsplit('.', 1)[0]
    post_meta = {'title': '', 'keywords': '', 'abstract': '', 'date': '', 'tags': '',
                 'file_name': file_name}

    try:
        with open("config.yaml", 'r', encoding='utf-8') as config_file:
            config = yaml.full_load(config_file)
            if file_name in config:
                post_config = config[file_name]
            else:
                post_config = None
    except IOError as e:
        print(e)
        config = {}
        post_config = None
        print("First time to build.")

    if post_config:
        post_meta['date'] = post_config['date']
    else:
        import time
        post_meta['date'] = time.strftime("%Y/%m/%d", time.localtime())

    for line in post_file:
        if line:
            m = re.search(r"^\s*#\s*([^#]+)\n", line)
            if m:
                post_meta['title'] = m.group(1)
                print(f"Found title in post: {post_meta['title']}")

                # read keywords/abstract
                next_line = skip_white_lines(post_file)
                keywords_match = re.search(r'\s*^\*\*(.*)\*\*$\s*', next_line)
                if keywords_match:
                    post_meta['keywords'] = keywords_match.group(1)

                next_line = skip_white_lines(post_file)
                abstract_match = re.search(r'\s*^>\s*(.*)\s*', next_line)
                if abstract_match:
                    post_meta['abstract'] = abstract_match.group(1)

                next_line = skip_white_lines(post_file)
                tags_match = re.search(r'\s*==\s*(.*)\s*==', next_line)
                if tags_match:
                    post_meta['tags'] = tags_match.group(1)

                # while True:
                #     next_line = skip_white_lines(post_file)
                #     kv = re.search(r'\s*/(.*)/(.*)/\s*', next_line)
                #     if kv:
                #         post_meta[kv.group(1)] = kv.group(2)
                #     else:
                #         break
            else:
                post_meta['title'] = post_meta['file_name']
                print(f"Not found title in post, use file name: {post_meta['title']}")
                post_file.seek(0)

            break

    config[file_name] = post_meta

    with open('config.yaml', 'w', encoding='utf-8') as config_file:
        yaml.dump(config, config_file, allow_unicode=True)

    return post_meta


def skip_white_lines(file):
    next_line = file.readline()
    while next_line and next_line.isspace():
        next_line = file.readline()
    return next_line


def build_category(posts, category):
    print(f"Build {category}.")
    header = get_part_file_path(category, 'header')
    header_file = open(header, 'r', encoding='UTF-8')
    footer = get_part_file_path(category, 'footer')
    footer_file = open(footer, 'r', encoding='UTF-8')

    build_dir = get_build_dir(category)
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
    os.makedirs(build_dir)

    for post in posts:
        output_path = os.path.join(build_dir, os.path.basename(post))
        print(f"Build {post} into {output_path}")
        header_file.seek(0)
        footer_file.seek(0)

        if os.path.exists(output_path):
            os.remove(output_path)

        post_file = open(post, 'r', encoding='UTF-8')
        output_file = open(output_path, 'w', encoding='UTF-8')

        post_meta = retrieve_post_meta(post_file)
        # if category == 'csdn':
        #     # escape '()' for csdn
        #     post_meta['title'] = post_meta['title'].replace('(', '&#40;').replace(')', '&#41;')

        if category == 'blog':
            post_meta['tags'] = "\n".join(map(lambda e: f"    - {e.lower()}", post_meta['tags'].split("|")))

        header_content = header_file.read()
        for _, k in enumerate(post_meta):
            header_content = header_content.replace("{{" + k + "}}", post_meta[k])

        bilibili_content = ''
        if 'bilibili_id' in post_meta:
            bilibili_path = get_part_file_path(category, 'bilibili')
            if os.path.exists(bilibili_path):
                bilibili_file = open(bilibili_path, 'r', encoding='UTF-8')
                if bilibili_file:
                    bilibili_content = bilibili_file.read().replace("{{bilibili_id}}", post_meta['bilibili_id'])
            
        header_content = header_content.replace("{{bilibili}}", bilibili_content)

        output_file.write(header_content)
        output_file.write('\n')

        for line in post_file:
            if category == 'mp':
                newline = re.sub(r'(?<!!)\[([^\]]*?)\]\s*\(((?!https?://mp.weixin.qq.com).*?)\)', r'**\1**(\2)', line)
                if newline != line:
                    print("Matched non-wechat url: {line} -> {newline}".format(line=line, newline=newline))
                line = newline
            output_file.write(line)

        output_file.write('\n')
        output_file.write(footer_file.read())

        output_file.close()
        post_file.close()

    header_file.close()
    footer_file.close()
    print(f"Build {category} successfully.")


def main():
    init_working_dir()
    print(f"Current working dir: {os.curdir}")
    posts = get_post_files()
    print(f"Posts: {posts}")

    CATEGORIES = get_categories()
    print(f"Categories: {CATEGORIES}")
    for category in CATEGORIES:
        build_category(posts, category)


def init_working_dir():
    if len(sys.argv) == 2:
        target_file = sys.argv[1]
        if os.path.isdir(target_file):
            os.chdir(target_file)
        else:
            raise Exception(f"{target_file} not exists or is not a dir.")


if __name__ == '__main__':
    main()
