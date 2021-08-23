FROM circleci/node:14.11.0

ARG HONEYBADGER_API_KEY
ENV HONEYBADGER_API_KEY=$HONEYBADGER_API_KEY

USER root

RUN apt-get update \
  && apt-get install python-pip \
  && pip install awscli --upgrade

ENV AWS_DEFAULT_REGION us-west-2

USER circleci
WORKDIR /home/circleci

COPY package.json .
COPY package-lock.json .

RUN npm install

COPY --chown=circleci:circleci . .

RUN chmod +x bin/docker_export.sh

CMD ["bin/docker_export.sh"]
