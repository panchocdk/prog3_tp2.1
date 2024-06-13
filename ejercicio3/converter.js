class Currency {
    constructor(code, name) {
        this.code = code;
        this.name = name;
    }
}

class CurrencyConverter {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.currencies = [];
    }

    addCurrency(currency) {
        this.currencies.push(currency);
    }

    async getCurrencies() {
        const response = await fetch(`${this.apiUrl}/currencies`);
        const data = await response.json();
        Object.entries(data).forEach((key) => this.addCurrency(new Currency(key[0], key[1])));
    }

    convertCurrency(amount, fromCurrency, toCurrency) {
        return new Promise((resolve) => {
            if (fromCurrency.code == toCurrency.code) {
                resolve(parseInt(amount));
            } else {
                fetch(`${this.apiUrl}/latest?amount=${amount}&from=${fromCurrency.code}&to=${toCurrency.code}`)
                .then(response => {
                    if (!response.ok) {
                        //throw new Error("Error en la solicitud");
                        resolve(null);
                    }
                    return response.json();
                })
                .then(data => {
                    resolve(data.rates[toCurrency.code]);
                })
                .catch(error => {
                    //console.error("Error en la solicitud", error);
                    //reject(error);
                    resolve(null)
                }); 
            }
        })
    }

    async getExchangeRateDifference(fromCurrency, toCurrency) {
        if (fromCurrency.code === toCurrency.code) {
            return 0;
        }

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${year}-${month}-${day}`;
        };

        const todayStr = formatDate(today);
        const yesterdayStr = formatDate(yesterday);

        try {
            const todayResponse = await fetch(`${this.apiUrl}/${todayStr}?from=${fromCurrency.code}&to=${toCurrency.code}`);
            const yesterdayResponse = await fetch(`${this.apiUrl}/${yesterdayStr}?from=${fromCurrency.code}&to=${toCurrency.code}`);

            const todayData = await todayResponse.json();
            const yesterdayData = await yesterdayResponse.json();

            const todayRate = todayData.rates[toCurrency.code];
            const yesterdayRate = yesterdayData.rates[toCurrency.code];

            return todayRate - yesterdayRate;
        } catch (error) {
            console.error('Error en la solicitud de diferencia de tipo de cambio:', error);
            return null;
        }
    }

}

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("conversion-form");
    const resultDiv = document.getElementById("result");
    const exchangeRateDiv = document.getElementById("exchange");
    const fromCurrencySelect = document.getElementById("from-currency");
    const toCurrencySelect = document.getElementById("to-currency");

    const converter = new CurrencyConverter("https://api.frankfurter.app");

    await converter.getCurrencies();
    populateCurrencies(fromCurrencySelect, converter.currencies);
    populateCurrencies(toCurrencySelect, converter.currencies);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const amount = document.getElementById("amount").value;
        const fromCurrency = converter.currencies.find(
            (currency) => currency.code === fromCurrencySelect.value
        );
        const toCurrency = converter.currencies.find(
            (currency) => currency.code === toCurrencySelect.value
        );

        const convertedAmount = await converter.convertCurrency(
            amount,
            fromCurrency,
            toCurrency
        );

        if (convertedAmount !== null && !isNaN(convertedAmount)) {
            resultDiv.textContent = `${amount} ${
                fromCurrency.code
            } son ${convertedAmount.toFixed(2)} ${toCurrency.code}`;
        } else {
            resultDiv.textContent = "Error al realizar la conversión.";
        }

        const difference = await converter.getExchangeRateDifference(fromCurrency, toCurrency);

        if (difference !== null && !isNaN(difference)) {
            exchangeRateDiv.textContent = `La diferencia de la tasa de cambio entre hoy y ayer es: ${difference.toFixed(4)} ${toCurrency.code}`;
        } else {
            exchangeRateDiv.textContent = "Error en la solicitud de diferencia de tipo de cambio.";
        }
    });

    

    function populateCurrencies(selectElement, currencies) {
        if (currencies) {
            currencies.forEach((currency) => {
                const option = document.createElement("option");
                option.value = currency.code;
                option.textContent = `${currency.code} - ${currency.name}`;
                selectElement.appendChild(option);
            });
        }
    }
});
