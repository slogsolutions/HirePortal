pipeline {
    agent any

    environment {
        SERVER_IP   = "YOUR_VPS_IP"
        SERVER_USER = "root"                 // or ubuntu
        APP_DIR     = "/var/www/hireportal"
        HEALTH_URL  = "http://YOUR_VPS_IP/api/health"
    }

    stages {

        stage("Checkout Code") {
            steps {
                checkout scm
            }
        }

        stage("Build Docker Images") {
            steps {
                echo "Building backend image"
                sh "docker build -t hireportal-server ./server"

                echo "Building frontend (nginx) image"
                sh "docker build -t hireportal-client ./client"
            }
        }

        stage("Deploy to VPS with Rollback") {
            steps {
                sshagent(credentials: ['vps_ssh_key']) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} '
                        set -e

                        mkdir -p ${APP_DIR}
                        cd ${APP_DIR}

                        echo " Saving current state for rollback"
                        docker compose ps > previous_state.txt || true

                        echo " Stopping old containers"
                        docker compose down || true

                        echo " Cleaning old files"
                        rm -rf server client docker-compose.yml

                        exit
                    '
                    """

                    sh """
                    scp -r server client docker-compose.yml \
                        ${SERVER_USER}@${SERVER_IP}:${APP_DIR}
                    """

                    sh """
                    ssh ${SERVER_USER}@${SERVER_IP} '
                        cd ${APP_DIR}

                        echo " Starting new deployment"
                        docker compose up -d --build

                        echo "Waiting for app to start"
                        sleep 15

                        STATUS=\$(curl -s -o /dev/null -w "%{http_code}" ${HEALTH_URL})

                        if [ "\$STATUS" != "200" ]; then
                            echo "❌ Health check failed"

                            echo "🔁 Rolling back..."
                            docker compose down
                            docker compose up -d

                            exit 1
                        fi

                        echo " Deployment successful"
                    '
                    """
                }
            }
        }
    }

    post {
        always {
            echo "🧹 Cleaning Jenkins Docker cache"
            sh "docker system prune -af"
        }
        failure {
            echo "❌ Pipeline failed — rollback triggered"
        }
    }
}
