package kz.enu.restvt.restexample.entities;

public class Player {
    private String name;
    private int age;
    public  int playerid;
    public SportClub sport;
    private final Gender gender;


    public Player(Gender gender) {
        this.gender = gender;
    }

    public Player (){
        this.gender = null;
    }

    public Player(String name, int age,  Gender gender, int playerid, SportClub sport ) {
        this.name =name;
        this.age = age;
        this. playerid = playerid;
        this.gender = gender;
        this.sport = sport;
    }

    public String getName() {
        return name;
    }
    public int getAge() {
        return age;
    }

    public int getPlayerid() {
        return playerid;
    }
    public void setName(String name) {
        this.name = name;
    }
    public void setAge(int age) {
        this.age = age;
    }
    public void setPlayerid(int playerid) {
        this.playerid = playerid;
    }
    public void setSport(SportClub sport) {
        this.sport = sport;
    }
}
