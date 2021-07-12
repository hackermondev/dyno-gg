window.onload = async () => {
    // The following function is located in index.html file.
    changeHeight(); // eslint-disable-line

    const decodedCookie = decodeURIComponent(document.cookie);
    const userName = decodedCookie.match(/EntityFullName=(.*)/)[1].split(";")[0];
    const userAvatar = decodedCookie.match(/EntityAvatar=(.*)/)[1].split(";")[0];
    const userID = decodedCookie.match(/placeholderID=(.*)/)[1].split(";")[0];
    document.getElementById("login").innerHTML = userName;
    document.getElementById("userAvatar").setAttribute("src", `${userAvatar}`);
    document.getElementById("codespan6").innerHTML = userName;
    document.getElementById("codespan7").innerHTML = userID;

    const config = {
        attributes: true
    };
    const elements = document.querySelectorAll("textarea");

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "attributes") {
                changeHeight(); // eslint-disable-line
            }
        }
    });

    for (const element of elements) {
        observer.observe(element, config);
    }
};