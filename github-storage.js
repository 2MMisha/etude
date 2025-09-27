class GitHubStorage {
    constructor() {
        this.username = '2mmisha';
        this.repo = 'etude';
        this.branch = 'main';
        this.token = localStorage.getItem('githubToken');
        this.baseUrl = 'https://api.github.com';
    }

    async getFile(filename) {
        try {
            if (!this.token) {
                return this.getLocalFile(filename);
            }

            const response = await fetch(
                `${this.baseUrl}/repos/${this.username}/${this.repo}/contents/data/${filename}`,
                {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (response.status === 404) {
                // Файл не существует, создаем пустой
                return [];
            }

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const data = await response.json();
            const content = JSON.parse(atob(data.content));
            
            // Сохраняем локально как кэш
            localStorage.setItem(filename, JSON.stringify(content));
            
            return content;
        } catch (error) {
            console.warn('GitHub недоступен, используем локальные данные:', error);
            return this.getLocalFile(filename);
        }
    }

    async saveFile(filename, content) {
        try {
            // Всегда сохраняем локально
            localStorage.setItem(filename, JSON.stringify(content));

            if (!this.token) {
                console.log('Токен не установлен, данные сохранены только локально');
                return true;
            }

            // Получаем текущий SHA файла
            let sha = null;
            try {
                const currentResponse = await fetch(
                    `${this.baseUrl}/repos/${this.username}/${this.repo}/contents/data/${filename}`,
                    {
                        headers: {
                            'Authorization': `token ${this.token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );
                
                if (currentResponse.ok) {
                    const currentData = await currentResponse.json();
                    sha = currentData.sha;
                }
            } catch (e) {
                // Файл не существует, это нормально
            }

            const response = await fetch(
                `${this.baseUrl}/repos/${this.username}/${this.repo}/contents/data/${filename}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify({
                        message: `Update ${filename} - ${new Date().toLocaleString('ru-RU')}`,
                        content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
                        sha: sha,
                        branch: this.branch
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Ошибка сохранения: ${response.status}`);
            }

            console.log('Данные успешно сохранены в GitHub');
            return true;
        } catch (error) {
            console.warn('Ошибка синхронизации с GitHub:', error);
            // Данные уже сохранены локально, так что это не критично
            return false;
        }
    }

    getLocalFile(filename) {
        try {
            return JSON.parse(localStorage.getItem(filename)) || [];
        } catch (error) {
            console.error('Ошибка чтения локальных данных:', error);
            return [];
        }
    }

    async loadChecks() {
        return await this.getFile('checks.json');
    }

    async saveChecks(checks) {
        return await this.saveFile('checks.json', checks);
    }

    async loadCustomers() {
        return await this.getFile('customers.json');
    }

    async saveCustomers(customers) {
        return await this.saveFile('customers.json', customers);
    }

    // Метод для проверки подключения
    async testConnection() {
        if (!this.token) {
            throw new Error('Токен не установлен');
        }

        const response = await fetch(
            `${this.baseUrl}/repos/${this.username}/${this.repo}`,
            {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Ошибка подключения: ${response.status}`);
        }

        return true;
    }
}

// Создаем глобальный экземпляр
window.githubStorage = new GitHubStorage();
