#include <iostream>
#include <fstream>   
#include <vector>    
using namespace std;

class UserAccount {
public:
    int id;
    string named;
    double balance;
    int password;

    void serialize(ofstream &out) const {
        out << id << " " << named << " " << balance << "\n";
    }

    void display() const {
        cout << "ID: " << id << " | Name: " << named << " | Balance: $" << balance << "\n";
    }

    void balancecheck(){
        cout << "Balance checked.\n";
        cout <<"Your current Balance is "<<"$"<<balance<<"\n";
    }

    void withdrawal(){
        int withdraw ;
        cout << "Withdraw amount\n";
        cin>>withdraw;
        if (balance>=withdraw){
            balance -= withdraw;
            cout<<"Successfully withdraw "<<"$"<<withdraw<<"\n";
        }else{
            cout<<"Not enough balance\n";
        }
    }

    void deposiT(){
        int deposit ;
        cout << "Deposits amount\n";
        cin>>deposit;
        balance += deposit;
        cout<<"You successfully deposit "<<"$"<<deposit<<"\n";
    }

    void changepin(){
        int newPin;
        cout << "Enter new pin: ";
        cin >> newPin;
        password = newPin;
        cout << "PIN successfully changed!\n";
    }
};

class AccountDatabase {
private:
    string filename = "accounts.txt";

public:
    void insertRecord(const UserAccount& acc) {
      ofstream outFile("accounts.txt", ios::app);
        if (!outFile) {
            cerr << "Error opening database file!" << endl;
            return;
        }
        acc.serialize(outFile);
        outFile.close();
        cout << "Record successfully saved to " << filename << "\n";
    }

    void saveAccounts(const vector<UserAccount>& accounts) {
        ofstream outFile("accounts.txt");
        for (const auto& acc : accounts) {
            outFile << acc.id << " " << acc.named << " "
                    << acc.balance << " " << acc.password << "\n";
        }
    }
};

int main(){
    AccountDatabase db;

    
    vector<UserAccount> accounts;
    ifstream inFile("accounts.txt");
    if (!inFile) {
        cerr << "Error: accounts.txt not found!\n";
        return 1;
    }
    UserAccount tmp;
    while (inFile >> tmp.id >> tmp.named >> tmp.balance >> tmp.password) {
        accounts.push_back(tmp);
    }
    inFile.close();

    string inputName;
    int inputPin;
    int choice;

    cout << "****Welcome to Axis Banking****\n";
    cout << "Enter your Account username: ";
    cin >> inputName;
    cout << "Enter your pin: ";
    cin >> inputPin;

    
    UserAccount* user = nullptr;
    for (auto& acc : accounts) {
        if (acc.named == inputName && acc.password == inputPin) {
            user = &acc;
            break;
        }
    }

    if (user != nullptr){
        do {
            cout << "\n***Please select a number*** \n";
            cout << "1.Check Balance \n";
            cout << "2.Withdraw \n";
            cout << "3.Deposit \n";
            cout << "4.Change pin \n";
            cout << "5.Exit \n";
            cout << "Enter choice: ";
            cin >> choice;

            switch(choice) {
                case 1: user->balancecheck(); break;
                case 2: user->withdrawal();  db.saveAccounts(accounts); break; 
                case 3: user->deposiT();     db.saveAccounts(accounts); break; 
                case 4: user->changepin();   db.saveAccounts(accounts); break; 
                case 5: cout << " Arigathanks....exitingggg !!! \n"; break;
            }
        }while(choice != 5);
    } else {
        cout << "thank you !!!!!" << endl;
    }

    return 0;
}
