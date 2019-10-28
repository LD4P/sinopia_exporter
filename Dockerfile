FROM circleci/node:12.6

WORKDIR /home/circleci

COPY package.json .
COPY package-lock.json .

RUN npm install

COPY --chown=circleci:circleci . .

RUN chmod +x bin/docker_export.sh

CMD ["bin/docker_export.sh"]
