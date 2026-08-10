pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        APP_DIR = '/home/selenoid/autotests-ai-app'
        COMPOSE_FILE = 'docker-compose.yml'
    }

    stages {
        stage('Checkout') {
            steps {
                dir(env.APP_DIR) {
                    sh 'git fetch --all && git reset --hard origin/main'
                }
            }
        }

        stage('Deploy stack') {
            steps {
                dir(env.APP_DIR) {
                    sh '''
                        docker compose -f "$COMPOSE_FILE" pull --ignore-buildable || true
                        docker compose -f "$COMPOSE_FILE" build backend
                        docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
                        docker compose -f "$COMPOSE_FILE" ps
                    '''
                }
            }
        }

        stage('Smoke') {
            steps {
                sh 'curl -fsS http://127.0.0.1:8081/api/terminal | grep -q postgresql'
                sh 'curl -fsS https://autotests.ai/api/terminal | grep -q postgresql'
            }
        }

        stage('Nginx') {
            steps {
                dir(env.APP_DIR) {
                    sh '''
                        if [[ -f deploy/nginx/autotests.ai.conf ]]; then
                          sudo cp deploy/nginx/autotests.ai.conf /etc/nginx/conf.d/autotests.ai.conf
                          sudo nginx -t
                          sudo systemctl reload nginx
                        fi
                    '''
                }
            }
        }

        stage('E2E') {
            steps {
                dir("${env.APP_DIR}/tests-java") {
                    sh './gradlew testE2e -Denv=autotests_jenkins -Dheadless=true'
                }
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: 'tests-java/build/test-results/test/*.xml'
        }
        failure {
            dir(env.APP_DIR) {
                sh 'docker compose -f "$COMPOSE_FILE" logs --tail=120 backend postgres || true'
            }
        }
    }
}
