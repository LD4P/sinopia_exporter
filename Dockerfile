FROM cimg/node:16.8

ENV HONEYBADGER_API_KEY
ENV HONEYBADGER_ENV

USER root

RUN apt-get update \
  && apt-get install python3-pip \
  && pip install awscli --upgrade

ENV AWS_DEFAULT_REGION us-west-2

USER circleci
WORKDIR /home/circleci

COPY --chown=circleci:circleci package.json .
COPY --chown=circleci:circleci package-lock.json .

RUN npm install

COPY --chown=circleci:circleci . .

RUN chmod +x bin/docker_export.sh

ENV NODE_ENV production

CMD ["bin/docker_export.sh"]
